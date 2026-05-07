import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { IsNull, Not } from "typeorm";

import {
  ConsignmentPayment,
  PaymentMethod,
  PaymentStatus,
} from "../entities/consignment-payment.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";

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
  constructor(private connection: TransactionalConnection) {}

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

    return (await this.findOne(ctx, saved.id))!;
  }

  async update(
    ctx: RequestContext,
    input: UpdatePaymentInput,
  ): Promise<ConsignmentPayment> {
    const repo = this.connection.getRepository(ctx, ConsignmentPayment);
    const soldRepo = this.connection.getRepository(ctx, ConsignmentSold);

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
    return (await this.findOne(ctx, payment.id))!;
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ConsignmentPayment);
    const payment = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!payment) return false;
    await repo.remove(payment);
    return true;
  }
}
