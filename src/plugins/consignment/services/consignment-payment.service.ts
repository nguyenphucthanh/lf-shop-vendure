import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { IsNull, Not } from "typeorm";

import { ConsignmentHistoryData } from "../entities/consignment-history-entry.entity";
import {
  ConsignmentPayment,
  PaymentMethod,
  PaymentStatus,
} from "../entities/consignment-payment.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";
import { ConsignmentHistoryService } from "./consignment-history.service";
import { ConsignmentReconciliationService } from "./consignment-reconciliation.service";
import { ConsignmentSettlementService } from "./consignment-settlement.service";

export interface CreatePaymentInput {
  storeId: ID;
  paymentDate: Date;
  paymentPolicy?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount?: number;
  soldId?: ID | null;
}

export interface UpdatePaymentInput extends Partial<
  Omit<CreatePaymentInput, "storeId">
> {
  id: ID;
}

@Injectable()
export class ConsignmentPaymentService {
  constructor(
    private connection: TransactionalConnection,
    private historyService: ConsignmentHistoryService,
    private reconciliationService: ConsignmentReconciliationService,
    private settlementService: ConsignmentSettlementService,
  ) {}

  async findAll(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentPayment[]> {
    return this.connection.getRepository(ctx, ConsignmentPayment).find({
      where: { storeId },
      relations: [
        "sold",
        "sold.items",
        "sold.items.quotation",
        "sold.items.quotation.productVariant",
      ],
      order: { paymentDate: "DESC" },
    });
  }

  async findOne(
    ctx: RequestContext,
    id: ID,
  ): Promise<ConsignmentPayment | null> {
    return this.connection.getRepository(ctx, ConsignmentPayment).findOne({
      where: { id, storeId: Not(IsNull()) },
      relations: [
        "store",
        "sold",
        "sold.items",
        "sold.items.quotation",
        "sold.items.quotation.productVariant",
      ],
    });
  }

  async create(
    ctx: RequestContext,
    input: CreatePaymentInput,
  ): Promise<ConsignmentPayment> {
    const discount = input.discount ?? 0;
    this.validatePaymentAmounts(input.subtotal, discount);

    // Validate settlement exists and allows payments
    await this.settlementService.validateSettlementAllowsPayment(
      ctx,
      input.storeId,
    );

    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentPayment);
      const soldRepo = this.connection.getRepository(txCtx, ConsignmentSold);

      let soldId: ID | null = input.soldId ?? null;
      if (soldId) {
        const sold = await soldRepo.findOne({
          where: {
            id: soldId,
            storeId: input.storeId,
          },
        });
        if (!sold) {
          throw new UserInputError(
            `Sold ${soldId} not found for store ${input.storeId}`,
          );
        }
        soldId = sold.id;
      }

      // Validate payment does not exceed available payable
      const payableTotal = input.subtotal - discount;
      const storePayable =
        await this.reconciliationService.calculateStorePayable(
          txCtx,
          input.storeId,
        );

      if (payableTotal > storePayable.availablePayable) {
        throw new UserInputError(
          `Payment amount ${payableTotal} exceeds available payable ${storePayable.availablePayable} for store ${input.storeId}`,
        );
      }

      const subtotal = input.subtotal;
      const total = subtotal - discount;

      const payment = repo.create({
        storeId: input.storeId,
        paymentDate: input.paymentDate,
        paymentPolicy: input.paymentPolicy ?? null,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        subtotal,
        discount,
        total,
        soldId,
      });
      const saved = await repo.save(payment);
      const created = await this.findOne(txCtx, saved.id);
      if (!created) {
        throw new UserInputError(`Payment ${saved.id} not found`);
      }
      await this.historyService.record(txCtx, {
        storeId: created.storeId,
        objectType: "PAYMENT",
        objectId: created.id,
        type: "CREATED",
        data: this.snapshot(created),
      });

      return created;
    });
  }

  async update(
    ctx: RequestContext,
    input: UpdatePaymentInput,
  ): Promise<ConsignmentPayment> {
    const beforePayment = await this.findOne(ctx, input.id);

    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentPayment);
      const soldRepo = this.connection.getRepository(txCtx, ConsignmentSold);

      const payment = await repo.findOne({
        where: {
          id: input.id,
          storeId: Not(IsNull()),
        },
      });
      if (!payment) {
        throw new UserInputError(`Payment ${input.id} not found`);
      }

      if (input.soldId !== undefined) {
        if (input.soldId === null) {
          payment.soldId = null;
        } else {
          const sold = await soldRepo.findOne({
            where: {
              id: input.soldId,
              storeId: payment.storeId,
            },
          });
          if (!sold) {
            throw new UserInputError(
              `Sold ${input.soldId} not found for store ${payment.storeId}`,
            );
          }
          payment.soldId = sold.id;
        }
      }

      if (input.paymentDate !== undefined)
        payment.paymentDate = input.paymentDate;
      if (input.paymentPolicy !== undefined)
        payment.paymentPolicy = input.paymentPolicy ?? null;
      if (input.paymentMethod !== undefined)
        payment.paymentMethod = input.paymentMethod;
      if (input.paymentStatus !== undefined)
        payment.paymentStatus = input.paymentStatus;
      if (input.subtotal !== undefined) payment.subtotal = input.subtotal;
      if (input.discount !== undefined) payment.discount = input.discount;

      this.validatePaymentAmounts(payment.subtotal, payment.discount);
      payment.total = payment.subtotal - payment.discount;

      // Validate updated payment does not exceed available payable
      // Compare against store payable, excluding the current payment from completed payments
      const storePayable =
        await this.reconciliationService.calculateStorePayable(
          txCtx,
          payment.storeId,
        );

      // If this payment was completed, we need to account for it in payable calculation
      const priorTotal = beforePayment?.total ?? 0;
      const priorWasCompleted =
        beforePayment?.paymentStatus === "Completed" ? priorTotal : 0;
      const currentPayableWithoutThis =
        storePayable.availablePayable + priorWasCompleted;

      if (payment.total > currentPayableWithoutThis) {
        throw new UserInputError(
          `Payment amount ${payment.total} exceeds available payable ${currentPayableWithoutThis} for store ${payment.storeId}`,
        );
      }

      await repo.save(payment);
      const updated = await this.findOne(txCtx, payment.id);
      if (!updated) {
        throw new UserInputError(`Payment ${payment.id} not found`);
      }
      if (beforePayment) {
        const changes = this.historyService.buildChanges(
          this.snapshot(beforePayment),
          this.snapshot(updated),
        );
        if (changes.length > 0) {
          await this.historyService.record(txCtx, {
            storeId: updated.storeId,
            objectType: "PAYMENT",
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
    const beforePayment = await this.findOne(ctx, id);
    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentPayment);
      const payment = await repo.findOne({
        where: {
          id,
          storeId: Not(IsNull()),
        },
      });
      if (!payment) return false;
      await repo.remove(payment);
      if (beforePayment) {
        await this.historyService.record(txCtx, {
          storeId: beforePayment.storeId,
          objectType: "PAYMENT",
          objectId: beforePayment.id,
          type: "DELETED",
          data: this.snapshot(beforePayment),
        });
      }
      return true;
    });
  }

  private validatePaymentAmounts(subtotal: number, discount: number): void {
    if (subtotal < 0) {
      throw new UserInputError("subtotal cannot be negative");
    }
    if (discount < 0) {
      throw new UserInputError("discount cannot be negative");
    }
    if (discount > subtotal) {
      throw new UserInputError("discount cannot exceed subtotal");
    }
  }

  private snapshot(payment: ConsignmentPayment): ConsignmentHistoryData {
    return {
      storeId: this.historyService.toHistoryValue(payment.storeId),
      paymentDate: this.historyService.toHistoryValue(payment.paymentDate),
      paymentPolicy: this.historyService.toHistoryValue(payment.paymentPolicy),
      paymentMethod: this.historyService.toHistoryValue(payment.paymentMethod),
      paymentStatus: this.historyService.toHistoryValue(payment.paymentStatus),
      subtotal: this.historyService.toHistoryValue(payment.subtotal),
      discount: this.historyService.toHistoryValue(payment.discount),
      total: this.historyService.toHistoryValue(payment.total),
      soldId: this.historyService.toHistoryValue(payment.soldId),
    };
  }
}
