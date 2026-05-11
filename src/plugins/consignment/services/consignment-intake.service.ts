import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
  StockLevelService,
  StockLocationService,
  Logger,
} from "@vendure/core";
import { Not, IsNull } from "typeorm";

import { ConsignmentHistoryData } from "../entities/consignment-history-entry.entity";
import { ConsignmentIntake } from "../entities/consignment-intake.entity";
import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentHistoryService } from "./consignment-history.service";

const loggerCtx = "ConsignmentIntakeService";

export interface IntakeItemInput {
  quotationId: ID;
  quantity: number;
  consignmentPriceSnapshot?: number;
}

export interface CreateIntakeInput {
  storeId: ID;
  intakeDate: Date;
  paymentPolicy?: string | null;
  deliveryMethod?: string | null;
  deliveryTrackingCode?: string | null;
  deliveryCost?: number;
  items: IntakeItemInput[];
}

export interface UpdateIntakeInput extends Partial<
  Omit<CreateIntakeInput, "storeId">
> {
  id: ID;
}

@Injectable()
export class ConsignmentIntakeService {
  constructor(
    private connection: TransactionalConnection,
    private stockLevelService: StockLevelService,
    private stockLocationService: StockLocationService,
    private historyService: ConsignmentHistoryService,
  ) {}

  async findAll(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentIntake[]> {
    return this.connection.getRepository(ctx, ConsignmentIntake).find({
      where: { storeId },
      relations: ["items", "items.quotation", "items.quotation.productVariant"],
      order: { intakeDate: "DESC" },
    });
  }

  async findOne(
    ctx: RequestContext,
    id: ID,
  ): Promise<ConsignmentIntake | null> {
    return this.connection.getRepository(ctx, ConsignmentIntake).findOne({
      where: { id, storeId: Not(IsNull()) },
      relations: [
        "store",
        "items",
        "items.quotation",
        "items.quotation.productVariant",
      ],
    });
  }

  async create(
    ctx: RequestContext,
    input: CreateIntakeInput,
  ): Promise<ConsignmentIntake> {
    const repo = this.connection.getRepository(ctx, ConsignmentIntake);
    const itemRepo = this.connection.getRepository(ctx, ConsignmentIntakeItem);
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );

    const intake = repo.create({
      storeId: input.storeId,
      intakeDate: input.intakeDate,
      paymentPolicy: input.paymentPolicy ?? null,
      deliveryMethod: input.deliveryMethod ?? null,
      deliveryTrackingCode: input.deliveryTrackingCode ?? null,
      deliveryCost: input.deliveryCost ?? 0,
      total: 0,
    });
    const saved = await repo.save(intake);

    // Get primary stock location
    const primaryLocation =
      await this.stockLocationService.defaultStockLocation(ctx);
    if (!primaryLocation) {
      throw new Error("No default stock location found");
    }

    let itemsSubtotal = 0;
    for (const itemInput of input.items) {
      const quotation = await quotationRepo.findOne({
        where: { id: itemInput.quotationId },
        relations: ["productVariant"],
      });
      if (!quotation)
        throw new UserInputError(
          `Quotation ${itemInput.quotationId} not found`,
        );
      const consignmentPriceSnapshot =
        itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
      const subtotal = consignmentPriceSnapshot * itemInput.quantity;
      await itemRepo.save(
        itemRepo.create({
          intakeId: saved.id,
          quotationId: quotation.id,
          currency: quotation.currency,
          productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
          consignmentPriceSnapshot,
          quantity: itemInput.quantity,
          subtotal,
        }),
      );
      itemsSubtotal += subtotal;

      // Decrease stock: consignor takes items
      try {
        await this.stockLevelService.updateStockOnHandForLocation(
          ctx,
          quotation.productVariant.id,
          primaryLocation.id,
          -itemInput.quantity, // negative = decrease
        );
        Logger.info(
          `Intake ${saved.id}: decreased stock for variant ${quotation.productVariant.id} by ${itemInput.quantity}`,
          loggerCtx,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        Logger.error(
          `Failed to adjust stock for variant ${quotation.productVariant.id}: ${message}`,
          loggerCtx,
        );
        throw err;
      }
    }

    saved.total = itemsSubtotal;
    await repo.save(saved);
    const created = await this.findOne(ctx, saved.id);
    if (!created) {
      throw new UserInputError(`Intake ${saved.id} not found`);
    }
    await this.historyService.record(ctx, {
      storeId: created.storeId,
      objectType: "INTAKE",
      objectId: created.id,
      type: "CREATED",
      data: this.snapshot(created),
    });

    return created;
  }

  async update(
    ctx: RequestContext,
    input: UpdateIntakeInput,
  ): Promise<ConsignmentIntake> {
    const repo = this.connection.getRepository(ctx, ConsignmentIntake);
    const itemRepo = this.connection.getRepository(ctx, ConsignmentIntakeItem);
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );
    const beforeIntake = await this.findOne(ctx, input.id);

    const intake = await repo.findOne({
      where: {
        id: input.id,
        storeId: Not(IsNull()),
      },
    });
    if (!intake) {
      throw new UserInputError(`Intake ${input.id} not found`);
    }

    // Get primary stock location
    const primaryLocation =
      await this.stockLocationService.defaultStockLocation(ctx);
    if (!primaryLocation) {
      throw new Error("No default stock location found");
    }

    if (input.intakeDate !== undefined) intake.intakeDate = input.intakeDate;
    if (input.paymentPolicy !== undefined)
      intake.paymentPolicy = input.paymentPolicy ?? null;
    if (input.deliveryMethod !== undefined)
      intake.deliveryMethod = input.deliveryMethod ?? null;
    if (input.deliveryTrackingCode !== undefined)
      intake.deliveryTrackingCode = input.deliveryTrackingCode ?? null;
    if (input.deliveryCost !== undefined)
      intake.deliveryCost = input.deliveryCost;

    if (input.items !== undefined) {
      const existingItems = await itemRepo.find({
        where: { intakeId: intake.id },
      });

      // Map old quantities by quotationId
      const oldQuantityMap = new Map<ID, number>();
      for (const item of existingItems) {
        oldQuantityMap.set(item.quotationId, item.quantity);
      }

      await itemRepo.delete({ intakeId: intake.id });
      let itemsSubtotal = 0;
      for (const itemInput of input.items) {
        const quotation = await quotationRepo.findOne({
          where: { id: itemInput.quotationId },
          relations: ["productVariant"],
        });
        if (!quotation)
          throw new UserInputError(
            `Quotation ${itemInput.quotationId} not found`,
          );
        if (quotation.storeId !== intake.storeId) {
          throw new UserInputError(
            `Quotation ${itemInput.quotationId} does not belong to store ${intake.storeId}`,
          );
        }
        const consignmentPriceSnapshot =
          itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
        const subtotal = consignmentPriceSnapshot * itemInput.quantity;
        await itemRepo.save(
          itemRepo.create({
            intakeId: intake.id,
            quotationId: quotation.id,
            currency: quotation.currency,
            productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
            consignmentPriceSnapshot,
            quantity: itemInput.quantity,
            subtotal,
          }),
        );
        itemsSubtotal += subtotal;

        // Calculate quantity delta and adjust stock
        const oldQuantity = oldQuantityMap.get(quotation.id) ?? 0;
        const delta = itemInput.quantity - oldQuantity;
        if (delta !== 0) {
          try {
            await this.stockLevelService.updateStockOnHandForLocation(
              ctx,
              quotation.productVariant.id,
              primaryLocation.id,
              -delta, // negative because intake = stock decrease
            );
            Logger.info(
              `Intake ${intake.id}: adjusted stock for variant ${quotation.productVariant.id} by ${-delta}`,
              loggerCtx,
            );
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            Logger.error(
              `Failed to adjust stock for variant ${quotation.productVariant.id}: ${message}`,
              loggerCtx,
            );
            throw err;
          }
        }
      }
      intake.total = itemsSubtotal;
    }

    await repo.save(intake);
    const updated = await this.findOne(ctx, intake.id);
    if (!updated) {
      throw new UserInputError(`Intake ${intake.id} not found`);
    }
    if (beforeIntake) {
      const changes = this.historyService.buildChanges(
        this.snapshot(beforeIntake),
        this.snapshot(updated),
      );
      if (changes.length > 0) {
        await this.historyService.record(ctx, {
          storeId: updated.storeId,
          objectType: "INTAKE",
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
    const repo = this.connection.getRepository(ctx, ConsignmentIntake);
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );
    const beforeIntake = await this.findOne(ctx, id);

    const intake = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
      relations: ["items"],
    });
    if (!intake) return false;

    // Get primary stock location
    const primaryLocation =
      await this.stockLocationService.defaultStockLocation(ctx);
    if (!primaryLocation) {
      throw new Error("No default stock location found");
    }

    // Restore stock for all items
    for (const item of intake.items) {
      const quotation = await quotationRepo.findOne({
        where: { id: item.quotationId },
        relations: ["productVariant"],
      });
      if (quotation) {
        try {
          await this.stockLevelService.updateStockOnHandForLocation(
            ctx,
            quotation.productVariant.id,
            primaryLocation.id,
            item.quantity, // positive = increase (restore)
          );
          Logger.info(
            `Intake ${id}: restored stock for variant ${quotation.productVariant.id} by ${item.quantity}`,
            loggerCtx,
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          Logger.error(
            `Failed to adjust stock for variant ${quotation.productVariant.id}: ${message}`,
            loggerCtx,
          );
          throw err;
        }
      }
    }

    await repo.remove(intake);
    if (beforeIntake) {
      await this.historyService.record(ctx, {
        storeId: beforeIntake.storeId,
        objectType: "INTAKE",
        objectId: beforeIntake.id,
        type: "DELETED",
        data: this.snapshot(beforeIntake),
      });
    }
    return true;
  }

  private snapshot(intake: ConsignmentIntake): ConsignmentHistoryData {
    return {
      storeId: this.historyService.toHistoryValue(intake.storeId),
      intakeDate: this.historyService.toHistoryValue(intake.intakeDate),
      paymentPolicy: this.historyService.toHistoryValue(intake.paymentPolicy),
      deliveryMethod: this.historyService.toHistoryValue(intake.deliveryMethod),
      deliveryTrackingCode: this.historyService.toHistoryValue(
        intake.deliveryTrackingCode,
      ),
      deliveryCost: this.historyService.toHistoryValue(intake.deliveryCost),
      total: this.historyService.toHistoryValue(intake.total),
      items: this.historyService.toHistoryValue(
        (intake.items ?? []).map((item) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot,
          currency: item.currency,
        })),
      ),
    };
  }
}
