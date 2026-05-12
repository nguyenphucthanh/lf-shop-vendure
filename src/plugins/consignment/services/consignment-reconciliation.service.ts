import { Injectable } from "@nestjs/common";
import { ID } from "@vendure/common/lib/shared-types";
import { RequestContext, TransactionalConnection } from "@vendure/core";

import { ConsignmentIntakeItem } from "../entities/consignment-intake-item.entity";
import { ConsignmentPayment } from "../entities/consignment-payment.entity";
import { ConsignmentReturnItem } from "../entities/consignment-return-item.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";

export interface PayableCalculation {
  totalIntake: number;
  totalReturned: number;
  totalPaid: number;
  availablePayable: number;
}

export interface SoldPayableCalculation {
  intakeTotal: number;
  totalReturned: number;
  totalPaid: number;
  availablePayable: number;
}

/**
 * Reconciliation service for consignment payments.
 *
 * Calculates payable amounts based on:
 * - Intake items (positive contribution to payable)
 * - Returned items (negative contribution to payable)
 * - Completed payments (reduces available payable)
 *
 * Payable = TotalIntake - TotalReturned - CompletedPayments
 */
@Injectable()
export class ConsignmentReconciliationService {
  constructor(private connection: TransactionalConnection) {}

  /**
   * Calculate payable for a store across all quotations.
   *
   * @param ctx Request context
   * @param storeId Store ID
   * @returns PayableCalculation with totals and available payable
   */
  async calculateStorePayable(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<PayableCalculation> {
    const totalIntake = await this.calculateTotalIntake(ctx, storeId);
    const totalReturned = await this.calculateTotalReturned(ctx, storeId);
    const totalPaid = await this.calculateTotalPaid(ctx, storeId);

    return {
      totalIntake,
      totalReturned,
      totalPaid,
      availablePayable: totalIntake - totalReturned - totalPaid,
    };
  }

  /**
   * Calculate payable for a specific sold record.
   *
   * This is used when a payment is linked to a sold record (soldId).
   * The payable is limited to the sold total, minus any returns/adjustments
   * specific to that sold, minus any prior payments linked to that sold.
   *
   * For now, we calculate store-wide payable. In a more advanced model,
   * we could track sold-specific returns and payments.
   *
   * @param ctx Request context
   * @param soldId Sold ID
   * @param storeId Store ID
   * @returns SoldPayableCalculation
   */
  async calculateSoldPayable(
    ctx: RequestContext,
    soldId: ID,
    storeId: ID,
  ): Promise<SoldPayableCalculation> {
    // Get the sold row to derive quotations used in this sold.
    const sold = await this.connection
      .getRepository(ctx, ConsignmentSold)
      .findOne({
        where: { id: soldId, storeId },
        relations: ["items"],
      });

    if (!sold) {
      return {
        intakeTotal: 0,
        totalReturned: 0,
        totalPaid: 0,
        availablePayable: 0,
      };
    }

    const quotationIds = (sold.items ?? []).map((item) => item.quotationId);
    if (quotationIds.length === 0) {
      return {
        intakeTotal: 0,
        totalReturned: 0,
        totalPaid: 0,
        availablePayable: 0,
      };
    }

    // Calculate intake only for quotations represented by this sold.
    const intakeRaw = await this.connection
      .getRepository(ctx, ConsignmentIntakeItem)
      .createQueryBuilder("ii")
      .innerJoin("ii.intake", "intake")
      .select("COALESCE(SUM(ii.subtotal), 0)", "total")
      .where("intake.storeId = :storeId", { storeId })
      .andWhere("ii.quotationId IN (:...quotationIds)", { quotationIds })
      .getRawOne<{ total: string | number }>();

    const intakeTotal = Number(intakeRaw?.total ?? 0);

    // For simplicity, calculate store-wide returns and paid
    // (A more advanced model would track sold-specific returns/payments)
    const totalReturned = await this.calculateTotalReturned(ctx, storeId);
    const totalPaid = await this.calculateTotalPaid(ctx, storeId);

    return {
      intakeTotal,
      totalReturned,
      totalPaid,
      availablePayable: intakeTotal - totalReturned - totalPaid,
    };
  }

  /**
   * Calculate total intake amount for a store.
   *
   * @param ctx Request context
   * @param storeId Store ID
   * @returns Total of all ConsignmentIntakeItem.subtotal for the store
   */
  private async calculateTotalIntake(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<number> {
    const result = await this.connection
      .getRepository(ctx, ConsignmentIntakeItem)
      .createQueryBuilder("item")
      .select("COALESCE(SUM(item.subtotal), 0)", "total")
      .innerJoin("item.intake", "intake")
      .where("intake.storeId = :storeId", { storeId })
      .getRawOne<{ total: string | number }>();

    return Number(result?.total ?? 0);
  }

  /**
   * Calculate total returned amount for a store.
   *
   * @param ctx Request context
   * @param storeId Store ID
   * @returns Total of all ConsignmentReturnItem.subtotal for the store
   */
  private async calculateTotalReturned(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<number> {
    const result = await this.connection
      .getRepository(ctx, ConsignmentReturnItem)
      .createQueryBuilder("item")
      .select("COALESCE(SUM(item.subtotal), 0)", "total")
      .innerJoin("item.consignmentReturn", "return")
      .where("return.storeId = :storeId", { storeId })
      .getRawOne<{ total: string | number }>();

    return Number(result?.total ?? 0);
  }

  /**
   * Calculate total completed payments for a store.
   *
   * Only includes payments with status "Completed".
   *
   * @param ctx Request context
   * @param storeId Store ID
   * @returns Total of all ConsignmentPayment.total where paymentStatus = "Completed"
   */
  private async calculateTotalPaid(
    ctx: RequestContext,
    storeId: ID,
  ): Promise<number> {
    const result = await this.connection
      .getRepository(ctx, ConsignmentPayment)
      .createQueryBuilder("payment")
      .select("COALESCE(SUM(payment.total), 0)", "total")
      .where("payment.storeId = :storeId", { storeId })
      .andWhere("payment.paymentStatus = :status", { status: "Completed" })
      .getRawOne<{ total: string | number }>();

    return Number(result?.total ?? 0);
  }
}
