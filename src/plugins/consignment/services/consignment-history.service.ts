import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  User,
  UserInputError,
} from "@vendure/core";

import {
  ConsignmentHistoryChange,
  ConsignmentHistoryData,
  ConsignmentHistoryEntry,
  ConsignmentHistoryEntryType,
  ConsignmentHistoryObjectType,
  ConsignmentHistoryValue,
} from "../entities/consignment-history-entry.entity";
import { ConsignmentIntake } from "../entities/consignment-intake.entity";
import { ConsignmentPayment } from "../entities/consignment-payment.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentReturn } from "../entities/consignment-return.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";
import { ConsignmentSettlement } from "../entities/consignment-settlement.entity";

export interface RecordConsignmentHistoryInput {
  storeId: ID;
  objectType: ConsignmentHistoryObjectType;
  objectId: ID;
  type: ConsignmentHistoryEntryType;
  note?: string | null;
  changes?: ConsignmentHistoryChange[];
  data?: ConsignmentHistoryData | null;
}

@Injectable()
export class ConsignmentHistoryService {
  constructor(private readonly connection: TransactionalConnection) {}

  async record(
    ctx: RequestContext,
    input: RecordConsignmentHistoryInput,
  ): Promise<ConsignmentHistoryEntry> {
    const repo = this.connection.getRepository(ctx, ConsignmentHistoryEntry);
    const actor = await this.getActor(ctx);

    const entry = repo.create({
      storeId: input.storeId,
      objectType: input.objectType,
      objectId: input.objectId,
      type: input.type,
      actorUserId: actor?.id ?? null,
      actorIdentifier: actor?.identifier ?? null,
      note: input.note ?? null,
      changes: input.changes ?? null,
      data: input.data ?? null,
    });

    return repo.save(entry);
  }

  async addNote(
    ctx: RequestContext,
    objectType: ConsignmentHistoryObjectType,
    objectId: ID,
    note: string,
  ): Promise<ConsignmentHistoryEntry> {
    const storeId = await this.resolveStoreId(ctx, objectType, objectId);
    return this.record(ctx, {
      storeId,
      objectType,
      objectId,
      type: "NOTE_ADDED",
      note,
    });
  }

  async getHistoryForObject(
    ctx: RequestContext,
    objectType: ConsignmentHistoryObjectType,
    objectId: ID,
  ): Promise<ConsignmentHistoryEntry[]> {
    return this.connection.getRepository(ctx, ConsignmentHistoryEntry).find({
      where: { objectType, objectId },
      order: { createdAt: "DESC" },
    });
  }

  buildChanges(
    before: ConsignmentHistoryData,
    after: ConsignmentHistoryData,
  ): ConsignmentHistoryChange[] {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: ConsignmentHistoryChange[] = [];

    for (const key of keys) {
      const previousValue = before[key] ?? null;
      const nextValue = after[key] ?? null;
      if (!this.valuesEqual(previousValue, nextValue)) {
        changes.push({
          field: key,
          before: previousValue,
          after: nextValue,
        });
      }
    }

    return changes;
  }

  toHistoryValue(value: unknown): ConsignmentHistoryValue {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.toHistoryValue(item));
    }
    if (typeof value === "object") {
      const result: ConsignmentHistoryData = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        result[key] = this.toHistoryValue(nestedValue);
      }
      return result;
    }
    return String(value);
  }

  private valuesEqual(
    left: ConsignmentHistoryValue,
    right: ConsignmentHistoryValue,
  ): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private async getActor(
    ctx: RequestContext,
  ): Promise<Pick<User, "id" | "identifier"> | null> {
    if (!ctx.activeUserId) {
      return null;
    }

    const user = await this.connection.getRepository(ctx, User).findOne({
      where: { id: ctx.activeUserId },
    });

    if (!user) {
      return null;
    }

    return { id: user.id, identifier: user.identifier };
  }

  private async resolveStoreId(
    ctx: RequestContext,
    objectType: ConsignmentHistoryObjectType,
    objectId: ID,
  ): Promise<ID> {
    switch (objectType) {
      case "QUOTATION": {
        const entity = await this.connection
          .getRepository(ctx, ConsignmentQuotation)
          .findOne({ where: { id: objectId } });
        if (!entity) {
          break;
        }
        return entity.storeId;
      }
      case "INTAKE": {
        const entity = await this.connection
          .getRepository(ctx, ConsignmentIntake)
          .findOne({ where: { id: objectId } });
        if (!entity) {
          break;
        }
        return entity.storeId;
      }
      case "RETURN": {
        const entity = await this.connection
          .getRepository(ctx, ConsignmentReturn)
          .findOne({ where: { id: objectId } });
        if (!entity) {
          break;
        }
        return entity.storeId;
      }
      case "SOLD": {
        const entity = await this.connection
          .getRepository(ctx, ConsignmentSold)
          .findOne({ where: { id: objectId } });
        if (!entity) {
          break;
        }
        return entity.storeId;
      }
      case "PAYMENT": {
        const entity = await this.connection
          .getRepository(ctx, ConsignmentPayment)
          .findOne({ where: { id: objectId } });
        if (!entity) {
          break;
        }
        return entity.storeId;
      }
      case "SETTLEMENT": {
        const entity = await this.connection
          .getRepository(ctx, ConsignmentSettlement)
          .findOne({ where: { id: objectId } });
        if (!entity) {
          break;
        }
        return entity.storeId;
      }
    }

    throw new UserInputError(
      `Cannot add history note: ${objectType} ${objectId} not found`,
    );
  }
}
