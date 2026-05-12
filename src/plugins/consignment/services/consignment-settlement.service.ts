import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import {
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from "@vendure/core";

import { ConsignmentHistoryData } from "../entities/consignment-history-entry.entity";
import { ConsignmentSettlement } from "../entities/consignment-settlement.entity";
import { ConsignmentHistoryService } from "./consignment-history.service";

export interface CreateSettlementInput {
  storeId: ID;
  settlementDate: Date;
  description?: string | null;
}

@Injectable()
export class ConsignmentSettlementService {
  constructor(
    private connection: TransactionalConnection,
    private historyService: ConsignmentHistoryService,
  ) {}

  /**
   * Find active (OPEN or APPROVED) settlement for a store.
   * Only one settlement should be active at a time.
   */
  async findActive(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentSettlement | null> {
    return this.connection.getRepository(ctx, ConsignmentSettlement).findOne({
      where: [
        { storeId, status: "OPEN" },
        { storeId, status: "APPROVED" },
      ],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Find all settlements for a store.
   */
  async findAll(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<ConsignmentSettlement[]> {
    return this.connection.getRepository(ctx, ConsignmentSettlement).find({
      where: { storeId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Find one settlement by ID.
   */
  async findOne(
    ctx: RequestContext,
    id: ID,
  ): Promise<ConsignmentSettlement | null> {
    return this.connection.getRepository(ctx, ConsignmentSettlement).findOne({
      where: { id },
    });
  }

  /**
   * Create a new settlement in OPEN status.
   */
  async create(
    ctx: RequestContext,
    input: CreateSettlementInput,
  ): Promise<ConsignmentSettlement> {
    // Check if an active settlement already exists
    const existing = await this.findActive(ctx, input.storeId);
    if (existing) {
      throw new UserInputError(
        `Settlement ${existing.status} already exists for store ${input.storeId}`,
      );
    }

    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSettlement);

      const settlement = repo.create({
        storeId: input.storeId,
        settlementDate: input.settlementDate,
        description: input.description ?? null,
        status: "OPEN",
        createdAt: new Date(),
        approvedAt: null,
        paidAt: null,
        closedAt: null,
      });

      const saved = await repo.save(settlement);
      const created = await this.findOne(txCtx, saved.id);
      if (!created) {
        throw new UserInputError(`Settlement ${saved.id} not found`);
      }

      await this.historyService.record(txCtx, {
        storeId: created.storeId,
        objectType: "SETTLEMENT",
        objectId: created.id,
        type: "CREATED",
        data: this.snapshot(created),
      });

      return created;
    });
  }

  /**
   * Approve a settlement (OPEN → APPROVED).
   * Once approved, no new intakes or sales can be added to this settlement period.
   */
  async approve(ctx: RequestContext, id: ID): Promise<ConsignmentSettlement> {
    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSettlement);

      const settlement = await repo.findOne({ where: { id } });
      if (!settlement) {
        throw new UserInputError(`Settlement ${id} not found`);
      }

      if (settlement.status !== "OPEN") {
        throw new UserInputError(
          `Cannot approve settlement in ${settlement.status} status; only OPEN settlements can be approved`,
        );
      }

      settlement.status = "APPROVED";
      settlement.approvedAt = new Date();
      await repo.save(settlement);

      const updated = await this.findOne(txCtx, settlement.id);
      if (!updated) {
        throw new UserInputError(`Settlement ${settlement.id} not found`);
      }

      await this.historyService.record(txCtx, {
        storeId: updated.storeId,
        objectType: "SETTLEMENT",
        objectId: updated.id,
        type: "UPDATED",
        changes: [
          {
            field: "status",
            before: "OPEN",
            after: "APPROVED",
          },
        ],
        data: this.snapshot(updated),
      });

      return updated;
    });
  }

  /**
   * Mark settlement as paid (APPROVED → PAID).
   * This indicates all payments for this settlement period have been processed.
   */
  async markAsPaid(
    ctx: RequestContext,
    id: ID,
  ): Promise<ConsignmentSettlement> {
    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSettlement);

      const settlement = await repo.findOne({ where: { id } });
      if (!settlement) {
        throw new UserInputError(`Settlement ${id} not found`);
      }

      if (settlement.status !== "APPROVED") {
        throw new UserInputError(
          `Cannot mark as paid; settlement must be in APPROVED status, got ${settlement.status}`,
        );
      }

      settlement.status = "PAID";
      settlement.paidAt = new Date();
      await repo.save(settlement);

      const updated = await this.findOne(txCtx, settlement.id);
      if (!updated) {
        throw new UserInputError(`Settlement ${settlement.id} not found`);
      }

      await this.historyService.record(txCtx, {
        storeId: updated.storeId,
        objectType: "SETTLEMENT",
        objectId: updated.id,
        type: "UPDATED",
        changes: [
          {
            field: "status",
            before: "APPROVED",
            after: "PAID",
          },
        ],
        data: this.snapshot(updated),
      });

      return updated;
    });
  }

  /**
   * Close settlement (PAID → CLOSED).
   * Once closed, settlement cannot be reopened.
   */
  async close(ctx: RequestContext, id: ID): Promise<ConsignmentSettlement> {
    return this.connection.withTransaction(ctx, async (txCtx) => {
      const repo = this.connection.getRepository(txCtx, ConsignmentSettlement);

      const settlement = await repo.findOne({ where: { id } });
      if (!settlement) {
        throw new UserInputError(`Settlement ${id} not found`);
      }

      if (settlement.status !== "PAID") {
        throw new UserInputError(
          `Cannot close settlement; must be in PAID status, got ${settlement.status}`,
        );
      }

      settlement.status = "CLOSED";
      settlement.closedAt = new Date();
      await repo.save(settlement);

      const updated = await this.findOne(txCtx, settlement.id);
      if (!updated) {
        throw new UserInputError(`Settlement ${settlement.id} not found`);
      }

      await this.historyService.record(txCtx, {
        storeId: updated.storeId,
        objectType: "SETTLEMENT",
        objectId: updated.id,
        type: "UPDATED",
        changes: [
          {
            field: "status",
            before: "PAID",
            after: "CLOSED",
          },
        ],
        data: this.snapshot(updated),
      });

      return updated;
    });
  }

  /**
   * Validate that a settlement exists and is in a state that allows payments.
   * Returns true if settlement exists and is OPEN or APPROVED; throws if not found or PAID/CLOSED.
   */
  async validateSettlementAllowsPayment(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<boolean> {
    const settlement = await this.findActive(ctx, storeId);
    if (!settlement) {
      throw new UserInputError(
        `No active settlement found for store ${storeId}. Create or approve a settlement before recording payments.`,
      );
    }

    // OPEN and APPROVED both allow payments
    return settlement.status === "OPEN" || settlement.status === "APPROVED";
  }

  private snapshot(settlement: ConsignmentSettlement): ConsignmentHistoryData {
    return {
      storeId: this.historyService.toHistoryValue(settlement.storeId),
      status: this.historyService.toHistoryValue(settlement.status),
      settlementDate: this.historyService.toHistoryValue(
        settlement.settlementDate,
      ),
      description: this.historyService.toHistoryValue(settlement.description),
      createdAt: this.historyService.toHistoryValue(settlement.createdAt),
      approvedAt: this.historyService.toHistoryValue(settlement.approvedAt),
      paidAt: this.historyService.toHistoryValue(settlement.paidAt),
      closedAt: this.historyService.toHistoryValue(settlement.closedAt),
    };
  }
}
