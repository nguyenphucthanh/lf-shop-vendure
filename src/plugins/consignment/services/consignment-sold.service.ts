import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";
import { IsNull, Not } from "typeorm";

import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentSoldItem } from "../entities/consignment-sold-item.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";

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
  constructor(private connection: TransactionalConnection) {}

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
    const repo = this.connection.getRepository(ctx, ConsignmentSold);
    const itemRepo = this.connection.getRepository(ctx, ConsignmentSoldItem);

    if (input.items.length === 0) {
      throw new UserInputError("Sold requires at least one item");
    }

    const quotationById = await this.validateItemsBelongToStore(
      ctx,
      input.storeId,
      input.items,
    );
    await this.validateQuantityConstraint(ctx, input.storeId, input.items);

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
    return (await this.findOne(ctx, saved.id))!;
  }

  async update(
    ctx: RequestContext,
    input: UpdateSoldInput,
  ): Promise<ConsignmentSold> {
    const repo = this.connection.getRepository(ctx, ConsignmentSold);
    const itemRepo = this.connection.getRepository(ctx, ConsignmentSoldItem);

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
      if (input.items.length === 0) {
        throw new UserInputError("Sold requires at least one item");
      }
      const quotationById = await this.validateItemsBelongToStore(
        ctx,
        sold.storeId,
        input.items,
      );
      await this.validateQuantityConstraint(
        ctx,
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
    return (await this.findOne(ctx, sold.id))!;
  }

  async delete(ctx: RequestContext, id: ID): Promise<boolean> {
    const repo = this.connection.getRepository(ctx, ConsignmentSold);
    const sold = await repo.findOne({
      where: {
        id,
        storeId: Not(IsNull()),
      },
    });
    if (!sold) return false;
    await repo.remove(sold);
    return true;
  }
}
