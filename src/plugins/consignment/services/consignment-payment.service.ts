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
    const repo = this.connection.getRepository(ctx, ConsignmentPayment);
    const soldRepo = this.connection.getRepository(ctx, ConsignmentSold);

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

    const subtotal = input.subtotal;
    const discount = input.discount ?? 0;
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
    const created = await this.findOne(ctx, saved.id);
    if (!created) {
      throw new UserInputError(`Payment ${saved.id} not found`);
    }
    await this.historyService.record(ctx, {
      storeId: created.storeId,
      objectType: "PAYMENT",
      objectId: created.id,
      type: "CREATED",
      data: this.snapshot(created),
    });

    return created;
  }

  async update(
    ctx: RequestContext,
    input: UpdatePaymentInput,
  ): Promise<ConsignmentPayment> {
    const repo = this.connection.getRepository(ctx, ConsignmentPayment);
    const soldRepo = this.connection.getRepository(ctx, ConsignmentSold);
    const beforePayment = await this.findOne(ctx, input.id);

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

    payment.total = payment.subtotal - payment.discount;

    await repo.save(payment);
    const updated = await this.findOne(ctx, payment.id);
    if (!updated) {
      throw new UserInputError(`Payment ${payment.id} not found`);
    }
    if (beforePayment) {
      const changes = this.historyService.buildChanges(
        this.snapshot(beforePayment),
        this.snapshot(updated),
      );
      if (changes.length > 0) {
        await this.historyService.record(ctx, {
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
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ConsignmentPayment);
    const beforePayment = await this.findOne(ctx, id);
    const payment = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!payment) return false;
    await repo.remove(payment);
    if (beforePayment) {
      await this.historyService.record(ctx, {
        storeId: beforePayment.storeId,
        objectType: "PAYMENT",
        objectId: beforePayment.id,
        type: "DELETED",
        data: this.snapshot(beforePayment),
      });
    }
    return true;
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
