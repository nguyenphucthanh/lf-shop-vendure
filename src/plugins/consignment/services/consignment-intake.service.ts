import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { Not, IsNull } from "typeorm";

import { ConsignmentIntake } from "../entities/consignment-intake.entity";
import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";

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
  constructor(private connection: TransactionalConnection) {}

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

    let itemsSubtotal = 0;
    const items: ConsignmentIntakeItem[] = [];
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
      const item = itemRepo.create({
        intakeId: saved.id,
        quotationId: quotation.id,
        currency: quotation.currency,
        productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
        consignmentPriceSnapshot,
        quantity: itemInput.quantity,
        subtotal,
      });
      items.push(await itemRepo.save(item));
      itemsSubtotal += subtotal;
    }

    saved.total = itemsSubtotal;
    await repo.save(saved);

    return (await this.findOne(ctx, saved.id))!;
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

    const intake = await repo.findOne({
      where: {
        id: input.id,
        storeId: Not(IsNull()),
      },
    });
    if (!intake) {
      throw new UserInputError(`Intake ${input.id} not found`);
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
        const item = itemRepo.create({
          intakeId: intake.id,
          quotationId: quotation.id,
          currency: quotation.currency,
          productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
          consignmentPriceSnapshot,
          quantity: itemInput.quantity,
          subtotal,
        });
        await itemRepo.save(item);
        itemsSubtotal += subtotal;
      }
      intake.total = itemsSubtotal;
    }

    await repo.save(intake);
    return (await this.findOne(ctx, intake.id))!;
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ConsignmentIntake);
    const intake = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!intake) return false;
    await repo.remove(intake);
    return true;
  }
}
