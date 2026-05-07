import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { IsNull, Not } from "typeorm";

import { ConsignmentReturn } from "../entities/consignment-return.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentSoldItem } from "../entities/consignment-sold-item.entity";

export interface ReturnItemInput {
  quotationId: ID;
  quantity: number;
  consignmentPriceSnapshot?: number;
}

export interface CreateReturnInput {
  storeId: ID;
  returnedDate: Date;
  reason?: string | null;
  items: ReturnItemInput[];
}

export interface UpdateReturnInput extends Partial<
  Omit<CreateReturnInput, "storeId">
> {
  id: ID;
}

@Injectable()
export class ConsignmentReturnService {
  constructor(private connection: TransactionalConnection) {}

  async findAll(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentReturn[]> {
    return this.connection.getRepository(ctx, ConsignmentReturn).find({
      where: { storeId },
      relations: ["items", "items.quotation", "items.quotation.productVariant"],
      order: { returnedDate: "DESC" },
    });
  }

  async findOne(
    ctx: RequestContext,
    id: ID,
  ): Promise<ConsignmentReturn | null> {
    return this.connection.getRepository(ctx, ConsignmentReturn).findOne({
      where: { id, storeId: Not(IsNull()) },
      relations: [
        "store",
        "items",
        "items.quotation",
        "items.quotation.productVariant",
      ],
    });
  }

  private async validateQuantityConstraint(
    ctx: RequestContext,
    storeId: ID,
    items: ReturnItemInput[],
    excludeReturnId?: ID,
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

    const requestedByQuotation = new Map<ID, number>();
    for (const item of items) {
      requestedByQuotation.set(
        item.quotationId,
        (requestedByQuotation.get(item.quotationId) ?? 0) + item.quantity,
      );
    }

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

      const soldQty = await soldItemRepo
        .createQueryBuilder("si")
        .innerJoin("si.sold", "sold")
        .where("sold.storeId = :storeId", { storeId })
        .andWhere("si.quotationId = :quotationId", { quotationId })
        .select("COALESCE(SUM(si.quantity), 0)", "total")
        .getRawOne()
        .then((r) => Number(r?.total ?? 0));

      const returnedQtyQuery = returnItemRepo
        .createQueryBuilder("ri")
        .innerJoin("ri.consignmentReturn", "ret")
        .where("ret.storeId = :storeId", { storeId })
        .andWhere("ri.quotationId = :quotationId", { quotationId });
      if (excludeReturnId) {
        returnedQtyQuery.andWhere("ret.id != :excludeReturnId", {
          excludeReturnId,
        });
      }
      const returnedQty = await returnedQtyQuery
        .select("COALESCE(SUM(ri.quantity), 0)", "total")
        .getRawOne()
        .then((r) => Number(r?.total ?? 0));

      const available = intakeQty - soldQty - returnedQty;
      if (requestedQuantity > available) {
        throw new UserInputError(
          `Quotation ${quotationId}: requested return quantity ${requestedQuantity} exceeds available ${available}.`,
        );
      }
    }
  }

  async create(
    ctx: RequestContext,
    input: CreateReturnInput,
  ): Promise<ConsignmentReturn> {
    await this.validateQuantityConstraint(ctx, input.storeId, input.items);

    const repo = this.connection.getRepository(ctx, ConsignmentReturn);
    const itemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );

    const ret = repo.create({
      storeId: input.storeId,
      returnedDate: input.returnedDate,
      reason: input.reason ?? null,
      total: 0,
    });
    const saved = await repo.save(ret);

    let total = 0;
    for (const itemInput of input.items) {
      const quotation = await quotationRepo.findOne({
        where: { id: itemInput.quotationId },
        relations: ["productVariant"],
      });
      if (!quotation)
        throw new UserInputError(
          `Quotation ${itemInput.quotationId} not found`,
        );
      if (quotation.storeId !== input.storeId) {
        throw new UserInputError(
          `Quotation ${itemInput.quotationId} does not belong to store ${input.storeId}`,
        );
      }
      const consignmentPriceSnapshot =
        itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
      const itemSubtotal = consignmentPriceSnapshot * itemInput.quantity;
      await itemRepo.save(
        itemRepo.create({
          consignmentReturnId: saved.id,
          quotationId: quotation.id,
          currency: quotation.currency,
          productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
          consignmentPriceSnapshot,
          quantity: itemInput.quantity,
          subtotal: itemSubtotal,
        }),
      );
      total += itemSubtotal;
    }

    saved.total = total;
    await repo.save(saved);
    return (await this.findOne(ctx, saved.id))!;
  }

  async update(
    ctx: RequestContext,
    input: UpdateReturnInput,
  ): Promise<ConsignmentReturn> {
    const repo = this.connection.getRepository(ctx, ConsignmentReturn);
    const itemRepo = this.connection.getRepository(ctx, ConsignmentReturnItem);
    const quotationRepo = this.connection.getRepository(
      ctx,
      ConsignmentQuotation,
    );

    const ret = await repo.findOne({
      where: {
        id: input.id,
        storeId: Not(IsNull()),
      },
    });
    if (!ret) {
      throw new UserInputError(`Return ${input.id} not found`);
    }

    if (input.items !== undefined) {
      await this.validateQuantityConstraint(
        ctx,
        ret.storeId,
        input.items,
        ret.id,
      );
      await itemRepo.delete({ consignmentReturnId: ret.id });
      let total = 0;
      for (const itemInput of input.items) {
        const quotation = await quotationRepo.findOne({
          where: { id: itemInput.quotationId },
          relations: ["productVariant"],
        });
        if (!quotation)
          throw new UserInputError(
            `Quotation ${itemInput.quotationId} not found`,
          );
        if (quotation.storeId !== ret.storeId) {
          throw new UserInputError(
            `Quotation ${itemInput.quotationId} does not belong to store ${ret.storeId}`,
          );
        }
        const consignmentPriceSnapshot =
          itemInput.consignmentPriceSnapshot ?? quotation.consignmentPrice;
        const itemSubtotal = consignmentPriceSnapshot * itemInput.quantity;
        await itemRepo.save(
          itemRepo.create({
            consignmentReturnId: ret.id,
            quotationId: quotation.id,
            currency: quotation.currency,
            productPriceSnapshot: quotation.productVariant?.priceWithTax ?? 0,
            consignmentPriceSnapshot,
            quantity: itemInput.quantity,
            subtotal: itemSubtotal,
          }),
        );
        total += itemSubtotal;
      }
      ret.total = total;
    }

    if (input.returnedDate !== undefined) ret.returnedDate = input.returnedDate;
    if (input.reason !== undefined) ret.reason = input.reason ?? null;

    await repo.save(ret);
    return (await this.findOne(ctx, ret.id))!;
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ConsignmentReturn);
    const ret = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!ret) return false;
    await repo.remove(ret);
    return true;
  }
}
