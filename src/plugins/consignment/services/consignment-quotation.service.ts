import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  ProductVariant,
  ProductVariantPrice,
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { IsNull, Not } from "typeorm";

import { ConsignmentHistoryData } from "../entities/consignment-history-entry.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentHistoryService } from "./consignment-history.service";

export interface UpsertQuotationInput {
  storeId: ID;
  productVariantId: ID;
  consignmentPrice: number;
  note?: string | null;
}

@Injectable()
export class ConsignmentQuotationService {
  constructor(
    private connection: TransactionalConnection,
    private historyService: ConsignmentHistoryService,
  ) {}

  async findAll(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentQuotation[]> {
    return this.connection.getRepository(ctx, ConsignmentQuotation).find({
      where: { storeId },
      relations: [
        "productVariant",
        "productVariant.translations",
        "productVariant.featuredAsset",
      ],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(
    ctx: RequestContext,
    id: ID,
  ): Promise<ConsignmentQuotation | null> {
    return this.connection.getRepository(ctx, ConsignmentQuotation).findOne({
      where: { id, storeId: Not(IsNull()) },
      relations: [
        "productVariant",
        "productVariant.translations",
        "productVariant.featuredAsset",
        "store",
      ],
    });
  }

  async create(
    ctx: RequestContext,
    input: UpsertQuotationInput,
  ): Promise<ConsignmentQuotation> {
    const repo = this.connection.getRepository(ctx, ConsignmentQuotation);
    const priceRepo = this.connection.getRepository(ctx, ProductVariantPrice);
    await this.connection.getEntityOrThrow(
      ctx,
      ProductVariant,
      input.productVariantId,
    );

    // ProductVariant.currencyCode is a hydrated field and may be undefined when loading the entity directly.
    // Read from ProductVariantPrice for the active channel to persist a stable currency snapshot.
    const channelPrice = await priceRepo.findOne({
      where: {
        variant: { id: input.productVariantId },
        channelId: ctx.channelId,
        currencyCode: ctx.currencyCode,
      },
    });
    const fallbackChannelPrice =
      channelPrice ??
      (await priceRepo.findOne({
        where: {
          variant: { id: input.productVariantId },
          channelId: ctx.channelId,
        },
      }));

    const currency =
      fallbackChannelPrice?.currencyCode ?? ctx.channel.defaultCurrencyCode;

    const quotation = repo.create({
      storeId: input.storeId,
      productVariantId: input.productVariantId,
      consignmentPrice: input.consignmentPrice,
      currency,
      note: input.note ?? null,
    });
    const saved = await repo.save(quotation);
    const created = await this.findOne(ctx, saved.id);
    if (!created) {
      throw new UserInputError(`Quotation ${saved.id} not found`);
    }
    await this.historyService.record(ctx, {
      storeId: created.storeId,
      objectType: "QUOTATION",
      objectId: created.id,
      type: "CREATED",
      data: this.snapshot(created),
    });
    return created;
  }

  async update(
    ctx: RequestContext,
    id: ID,
    input: Partial<UpsertQuotationInput>,
  ): Promise<ConsignmentQuotation> {
    const repo = this.connection.getRepository(ctx, ConsignmentQuotation);
    const beforeEntity = await this.findOne(ctx, id);
    const quotation = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!quotation) {
      throw new UserInputError(`Quotation ${id} not found`);
    }
    if (input.consignmentPrice !== undefined)
      quotation.consignmentPrice = input.consignmentPrice;
    if (input.note !== undefined) quotation.note = input.note ?? null;
    await repo.save(quotation);
    const updated = await this.findOne(ctx, quotation.id);
    if (!updated) {
      throw new UserInputError(`Quotation ${quotation.id} not found`);
    }
    if (beforeEntity) {
      const changes = this.historyService.buildChanges(
        this.snapshot(beforeEntity),
        this.snapshot(updated),
      );
      if (changes.length > 0) {
        await this.historyService.record(ctx, {
          storeId: updated.storeId,
          objectType: "QUOTATION",
          objectId: updated.id,
          type: "UPDATED",
          changes,
          data: this.snapshot(updated),
        });
      }
    }
    return updated;
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ConsignmentQuotation);
    const beforeEntity = await this.findOne(ctx, id);
    const quotation = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!quotation) return false;
    await repo.remove(quotation);
    if (beforeEntity) {
      await this.historyService.record(ctx, {
        storeId: beforeEntity.storeId,
        objectType: "QUOTATION",
        objectId: beforeEntity.id,
        type: "DELETED",
        data: this.snapshot(beforeEntity),
      });
    }
    return true;
  }

  private snapshot(quotation: ConsignmentQuotation): ConsignmentHistoryData {
    return {
      storeId: this.historyService.toHistoryValue(quotation.storeId),
      productVariantId: this.historyService.toHistoryValue(
        quotation.productVariantId,
      ),
      consignmentPrice: this.historyService.toHistoryValue(
        quotation.consignmentPrice,
      ),
      currency: this.historyService.toHistoryValue(quotation.currency),
      note: this.historyService.toHistoryValue(quotation.note),
    };
  }
}
