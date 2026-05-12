import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { IsNull, Not } from "typeorm";

import { ConsignmentHistoryData } from "../entities/consignment-history-entry.entity";
import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentSoldItem } from "../entities/consignment-sold-item.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";
import { ConsignmentHistoryService } from "./consignment-history.service";

export interface SoldItemInput {
  quotationId: ID;
  quantity: number;
  consignmentPriceSnapshot?: number;
}

export interface CreateSoldInput {
  storeId: ID;
  soldDate: Date;
  items: SoldItemInput[];
}

export interface UpdateSoldInput extends Partial<
  Omit<CreateSoldInput, "storeId">
> {
  id: ID;
}

@Injectable()
export class ConsignmentSoldService {
  constructor(
    private connection: TransactionalConnection,
    private historyService: ConsignmentHistoryService,
  ) {}

  async findAll(ctx: RequestContext, storeId: ID): Promise<ConsignmentSold[]> {
    return this.connection.getRepository(ctx, ConsignmentSold).find({
      where: { storeId },
      relations: ["items", "items.quotation", "items.quotation.productVariant"],
      order: { soldDate: "DESC" },
    });
  }

  async findOne(ctx: RequestContext, id: ID): Promise<ConsignmentSold | null> {
    return this.connection.getRepository(ctx, ConsignmentSold).findOne({
      where: { id, storeId: Not(IsNull()) },
      relations: [
        "store",
        "items",
        "items.quotation",
        "items.quotation.productVariant",
      ],
    });
  }

  private aggregateRequestedByQuotation(
    items: SoldItemInput[],
  ): Map<ID, number> {
    const requestedByQuotation = new Map<ID, number>();
    for (const item of items) {
      requestedByQuotation.set(
        item.quotationId,
        (requestedByQuotation.get(item.quotationId) ?? 0) + item.quantity,
      );
    }
    return requestedByQuotation;
  }

  private async validateItemsBelongToStore(
    ctx: RequestContext,
    storeId: ID,
    items: SoldItemInput[],
  ): Promise<Map<ID, ConsignmentQuotation>> {
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );
    const quotationById = new Map<ID, ConsignmentQuotation>();

    for (const itemInput of items) {
      const existingQuotation = quotationById.get(itemInput.quotationId);
      if (existingQuotation) {
        continue;
      }
      const quotation = await quotationRepo.findOne({
        where: { id: itemInput.quotationId },
        relations: ["productVariant"],
      });
      if (!quotation) {
        throw new UserInputError(
          `Quotation ${itemInput.quotationId} not found`,
        );
      }
      if (quotation.storeId !== storeId) {
        throw new UserInputError(
          `Quotation ${itemInput.quotationId} does not belong to store ${storeId}`,
        );
      }
      quotationById.set(quotation.id, quotation);
    }

    return quotationById;
  }

  private async validateQuantityConstraint(
    ctx: RequestContext,
    storeId: ID,
    items: SoldItemInput[],
    excludeSoldId?: ID,
  ): Promise<void> {
    const intakeItemRepo = this.connection.getRepository(
      ctx,
      ConsignmentIntakeItem,
    );
    const soldItemRepo = this.connection.getRepository(
      ctx,
      ConsignmentSoldItem,
    );
    const returnItemRepo = this.connection.getRepository(
      ctx,
      ConsignmentReturnItem,
    );

    const requestedByQuotation = this.aggregateRequestedByQuotation(items);

    for (const [
      quotationId,
      requestedQuantity,
    ] of requestedByQuotation.entries()) {
      const intakeQty = await intakeItemRepo
        .createQueryBuilder("ii")
        .innerJoin("ii.intake", "intake")
        .where("intake.storeId = :storeId", { storeId })
        .andWhere("ii.quotationId = :quotationId", { quotationId })
        .select("COALESCE(SUM(ii.quantity), 0)", "total")
        .getRawOne()
        .then((r) => Number(r?.total ?? 0));

      const soldQtyQuery = soldItemRepo
        .createQueryBuilder("si")
        .innerJoin("si.sold", "sold")
        .where("sold.storeId = :storeId", { storeId })
        .andWhere("si.quotationId = :quotationId", { quotationId });
      if (excludeSoldId) {
        soldQtyQuery.andWhere("sold.id != :excludeSoldId", { excludeSoldId });
      }
      const soldQty = await soldQtyQuery
        .select("COALESCE(SUM(si.quantity), 0)", "total")
        .getRawOne()
        .then((r) => Number(r?.total ?? 0));

      const returnedQty = await returnItemRepo
        .createQueryBuilder("ri")
        .innerJoin("ri.consignmentReturn", "ret")
        .where("ret.storeId = :storeId", { storeId })
        .andWhere("ri.quotationId = :quotationId", { quotationId })
        .select("COALESCE(SUM(ri.quantity), 0)", "total")
        .getRawOne()
        .then((r) => Number(r?.total ?? 0));

      const available = intakeQty - soldQty - returnedQty;
      if (requestedQuantity > available) {
        throw new UserInputError(
          `Quotation ${quotationId}: requested sold quantity ${requestedQuantity} exceeds available ${available} (intake: ${intakeQty}, sold: ${soldQty}, returned: ${returnedQty}).`,
        );
      }
    }
  }

  async create(
    ctx: RequestContext,
    input: CreateSoldInput,
  ): Promise<ConsignmentSold> {
    this.validateSoldItems(input.items);

    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSold);
      const itemRepo = this.connection.getRepository(
        txCtx,
        ConsignmentSoldItem,
      );

      const quotationById = await this.validateItemsBelongToStore(
        txCtx,
        input.storeId,
        input.items,
      );
      await this.validateQuantityConstraint(txCtx, input.storeId, input.items);

      const sold = repo.create({
        storeId: input.storeId,
        soldDate: input.soldDate,
        total: 0,
      });

      const saved = await repo.save(sold);

      let total = 0;
      for (const itemInput of input.items) {
        const quotation = quotationById.get(itemInput.quotationId);
        if (!quotation) {
          throw new UserInputError(
            `Quotation ${itemInput.quotationId} not found`,
          );
        }
        const consignmentPriceSnapshot =
          itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
        const subtotal = consignmentPriceSnapshot * itemInput.quantity;
        await itemRepo.save(
          itemRepo.create({
            soldId: saved.id,
            quotationId: quotation.id,
            currency: quotation.currency,
            productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
            consignmentPriceSnapshot,
            quantity: itemInput.quantity,
            subtotal,
          }),
        );
        total += subtotal;
      }

      saved.total = total;
      await repo.save(saved);
      const created = await this.findOne(txCtx, saved.id);
      if (!created) {
        throw new UserInputError(`Sold ${saved.id} not found`);
      }
      await this.historyService.record(txCtx, {
        storeId: created.storeId,
        objectType: "SOLD",
        objectId: created.id,
        type: "CREATED",
        data: this.snapshot(created),
      });
      return created;
    });
  }

  async update(
    ctx: RequestContext,
    input: UpdateSoldInput,
  ): Promise<ConsignmentSold> {
    if (input.items !== undefined) {
      this.validateSoldItems(input.items);
    }

    const beforeSold = await this.findOne(ctx, input.id);

    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSold);
      const itemRepo = this.connection.getRepository(
        txCtx,
        ConsignmentSoldItem,
      );

      const sold = await repo.findOne({
        where: {
          id: input.id,
          storeId: Not(IsNull()),
        },
      });
      if (!sold) {
        throw new UserInputError(`Sold ${input.id} not found`);
      }

      if (input.soldDate !== undefined) sold.soldDate = input.soldDate;

      if (input.items !== undefined) {
        const quotationById = await this.validateItemsBelongToStore(
          txCtx,
          sold.storeId,
          input.items,
        );
        await this.validateQuantityConstraint(
          txCtx,
          sold.storeId,
          input.items,
          sold.id,
        );

        await itemRepo.delete({ soldId: sold.id });

        let total = 0;
        for (const itemInput of input.items) {
          const quotation = quotationById.get(itemInput.quotationId);
          if (!quotation) {
            throw new UserInputError(
              `Quotation ${itemInput.quotationId} not found`,
            );
          }
          const consignmentPriceSnapshot =
            itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
          const subtotal = consignmentPriceSnapshot * itemInput.quantity;
          await itemRepo.save(
            itemRepo.create({
              soldId: sold.id,
              quotationId: quotation.id,
              currency: quotation.currency,
              productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
              consignmentPriceSnapshot,
              quantity: itemInput.quantity,
              subtotal,
            }),
          );
          total += subtotal;
        }
        sold.total = total;
      }

      await repo.save(sold);
      const updated = await this.findOne(txCtx, sold.id);
      if (!updated) {
        throw new UserInputError(`Sold ${sold.id} not found`);
      }
      if (beforeSold) {
        const changes = this.historyService.buildChanges(
          this.snapshot(beforeSold),
          this.snapshot(updated),
        );
        if (changes.length > 0) {
          await this.historyService.record(txCtx, {
            storeId: updated.storeId,
            objectType: "SOLD",
            objectId: updated.id,
            type: "UPDATED",
            changes,
            data: this.snapshot(updated),
          });
        }
      }
      return updated;
    });
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const beforeSold = await this.findOne(ctx, id);
    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSold);
      const sold = await repo.findOne({
        where: {
          id,
          storeId: Not(IsNull()),
        },
      });
      if (!sold) return false;
      await repo.remove(sold);
      if (beforeSold) {
        await this.historyService.record(txCtx, {
          storeId: beforeSold.storeId,
          objectType: "SOLD",
          objectId: beforeSold.id,
          type: "DELETED",
          data: this.snapshot(beforeSold),
        });
      }
      return true;
    });
  }

  private validateSoldItems(items: SoldItemInput[]): void {
    if (items.length === 0) {
      throw new UserInputError("Sold requires at least one item");
    }

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new UserInputError(
          `Quotation ${item.quotationId}: quantity must be a positive integer`,
        );
      }
      if (
        item.consignmentPriceSnapshot !== undefined &&
        item.consignmentPriceSnapshot < 0
      ) {
        throw new UserInputError(
          `Quotation ${item.quotationId}: consignmentPriceSnapshot cannot be negative`,
        );
      }
    }
  }

  private snapshot(sold: ConsignmentSold): ConsignmentHistoryData {
    return {
      storeId: this.historyService.toHistoryValue(sold.storeId),
      soldDate: this.historyService.toHistoryValue(sold.soldDate),
      total: this.historyService.toHistoryValue(sold.total),
      items: this.historyService.toHistoryValue(
        (sold.items ?? []).map((item) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot,
          currency: item.currency,
        })),
      ),
    };
  }
}
