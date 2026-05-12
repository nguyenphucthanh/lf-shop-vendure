import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Allow, Ctx, Permission, RequestContext } from "@vendure/core";

import {
  ConsignmentHistoryEntry,
  ConsignmentHistoryObjectType,
} from "../entities/consignment-history-entry.entity";
import { ConsignmentIntake } from "../entities/consignment-intake.entity";
import { ConsignmentPayment } from "../entities/consignment-payment.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentReturn } from "../entities/consignment-return.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";
import { ConsignmentSettlement } from "../entities/consignment-settlement.entity";
import { ConsignmentHistoryService } from "../services/consignment-history.service";
import {
  ConsignmentIntakeService,
  CreateIntakeInput,
  UpdateIntakeInput,
} from "../services/consignment-intake.service";
import {
  ConsignmentPaymentService,
  CreatePaymentInput,
  UpdatePaymentInput,
} from "../services/consignment-payment.service";
import { ConsignmentQuotationService } from "../services/consignment-quotation.service";
import { ConsignmentReportService } from "../services/consignment-report.service";
import {
  ConsignmentReturnService,
  CreateReturnInput,
  UpdateReturnInput,
} from "../services/consignment-return.service";
import {
  ConsignmentSoldService,
  CreateSoldInput,
  UpdateSoldInput,
} from "../services/consignment-sold.service";
import {
  ConsignmentSettlementService,
  CreateSettlementInput,
} from "../services/consignment-settlement.service";

function normalizeDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return new Date(0).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return `${value}T00:00:00.000Z`;
}

@Resolver()
export class ConsignmentResolver {
  constructor(
    private historyService: ConsignmentHistoryService,
    private quotationService: ConsignmentQuotationService,
    private intakeService: ConsignmentIntakeService,
    private soldService: ConsignmentSoldService,
    private paymentService: ConsignmentPaymentService,
    private returnService: ConsignmentReturnService,
    private reportService: ConsignmentReportService,
    private settlementService: ConsignmentSettlementService,
  ) {}

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentHistory(
    @Ctx() ctx: RequestContext,
    @Args("objectType") objectType: ConsignmentHistoryObjectType,
    @Args("objectId") objectId: string,
  ) {
    return this.historyService.getHistoryForObject(ctx, objectType, objectId);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  addConsignmentHistoryNote(
    @Ctx() ctx: RequestContext,
    @Args("objectType") objectType: ConsignmentHistoryObjectType,
    @Args("objectId") objectId: string,
    @Args("note") note: string,
  ) {
    return this.historyService.addNote(ctx, objectType, objectId, note);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentQuotations(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.quotationService.findAll(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentQuotation(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.quotationService.findOne(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  createConsignmentQuotation(
    @Ctx() ctx: RequestContext,
    @Args("input") input: Record<string, unknown>,
  ) {
    return this.quotationService.create(ctx, input as never);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  updateConsignmentQuotation(
    @Ctx() ctx: RequestContext,
    @Args("input") input: Record<string, unknown>,
  ) {
    return this.quotationService.update(ctx, String(input.id), input as never);
  }

  @Mutation()
  @Allow(Permission.DeleteCustomer)
  deleteConsignmentQuotation(
    @Ctx() ctx: RequestContext,
    @Args("id") id: string,
  ) {
    return this.quotationService.delete(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentIntakes(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.intakeService.findAll(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentIntake(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.intakeService.findOne(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  createConsignmentIntake(
    @Ctx() ctx: RequestContext,
    @Args("input") input: CreateIntakeInput,
  ) {
    return this.intakeService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  updateConsignmentIntake(
    @Ctx() ctx: RequestContext,
    @Args("input") input: UpdateIntakeInput,
  ) {
    return this.intakeService.update(ctx, input);
  }

  @Mutation()
  @Allow(Permission.DeleteCustomer)
  deleteConsignmentIntake(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.intakeService.delete(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentSolds(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.soldService.findAll(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentSold(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.soldService.findOne(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  createConsignmentSold(
    @Ctx() ctx: RequestContext,
    @Args("input") input: CreateSoldInput,
  ) {
    return this.soldService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  updateConsignmentSold(
    @Ctx() ctx: RequestContext,
    @Args("input") input: UpdateSoldInput,
  ) {
    return this.soldService.update(ctx, input);
  }

  @Mutation()
  @Allow(Permission.DeleteCustomer)
  deleteConsignmentSold(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.soldService.delete(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentPayments(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.paymentService.findAll(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentPayment(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.paymentService.findOne(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  createConsignmentPayment(
    @Ctx() ctx: RequestContext,
    @Args("input") input: CreatePaymentInput,
  ) {
    return this.paymentService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  updateConsignmentPayment(
    @Ctx() ctx: RequestContext,
    @Args("input") input: UpdatePaymentInput,
  ) {
    return this.paymentService.update(ctx, input);
  }

  @Mutation()
  @Allow(Permission.DeleteCustomer)
  deleteConsignmentPayment(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.paymentService.delete(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentReturns(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.returnService.findAll(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentReturn(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.returnService.findOne(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  createConsignmentReturn(
    @Ctx() ctx: RequestContext,
    @Args("input") input: CreateReturnInput,
  ) {
    return this.returnService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  updateConsignmentReturn(
    @Ctx() ctx: RequestContext,
    @Args("input") input: UpdateReturnInput,
  ) {
    return this.returnService.update(ctx, input);
  }

  @Mutation()
  @Allow(Permission.DeleteCustomer)
  deleteConsignmentReturn(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.returnService.delete(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentReport(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.reportService.getReport(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentTotalReport(@Ctx() ctx: RequestContext) {
    return this.reportService.getTotalReport(ctx);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentSettlements(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.settlementService.findAll(ctx, storeId);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentSettlement(@Ctx() ctx: RequestContext, @Args("id") id: string) {
    return this.settlementService.findOne(ctx, id);
  }

  @Query()
  @Allow(Permission.ReadCustomer)
  consignmentActiveSettlement(
    @Ctx() ctx: RequestContext,
    @Args("storeId") storeId: string,
  ) {
    return this.settlementService.findActive(ctx, storeId);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  createConsignmentSettlement(
    @Ctx() ctx: RequestContext,
    @Args("input") input: CreateSettlementInput,
  ) {
    return this.settlementService.create(ctx, input);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  approveConsignmentSettlement(
    @Ctx() ctx: RequestContext,
    @Args("id") id: string,
  ) {
    return this.settlementService.approve(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  markConsignmentSettlementAsPaid(
    @Ctx() ctx: RequestContext,
    @Args("id") id: string,
  ) {
    return this.settlementService.markAsPaid(ctx, id);
  }

  @Mutation()
  @Allow(Permission.UpdateCustomer)
  closeConsignmentSettlement(
    @Ctx() ctx: RequestContext,
    @Args("id") id: string,
  ) {
    return this.settlementService.close(ctx, id);
  }
}

@Resolver("ConsignmentHistoryEntry")
export class ConsignmentHistoryFieldResolver {
  @ResolveField()
  changes(@Parent() entry: ConsignmentHistoryEntry) {
    return entry.changes ?? [];
  }
}

@Resolver("ConsignmentQuotation")
export class ConsignmentQuotationFieldResolver {
  constructor(private readonly historyService: ConsignmentHistoryService) {}

  @ResolveField()
  productVariantName(@Parent() quotation: ConsignmentQuotation): string {
    const variant = quotation.productVariant;
    if (!variant) {
      return "";
    }
    const translatedName = variant.name;
    if (translatedName) {
      return translatedName;
    }
    if (
      Array.isArray(variant.translations) &&
      variant.translations.length > 0
    ) {
      return variant.translations[0]?.name ?? "";
    }
    return "";
  }

  @ResolveField()
  productVariantSku(@Parent() quotation: ConsignmentQuotation): string {
    return quotation.productVariant?.sku ?? "";
  }

  @ResolveField()
  productVariantFeaturedAsset(@Parent() quotation: ConsignmentQuotation) {
    return quotation.productVariant?.featuredAsset ?? null;
  }

  @ResolveField()
  history(
    @Ctx() ctx: RequestContext,
    @Parent() quotation: ConsignmentQuotation,
  ) {
    return this.historyService.getHistoryForObject(
      ctx,
      "QUOTATION",
      quotation.id,
    );
  }
}

@Resolver("ConsignmentIntake")
export class ConsignmentIntakeFieldResolver {
  constructor(private readonly historyService: ConsignmentHistoryService) {}

  @ResolveField()
  intakeDate(@Parent() intake: ConsignmentIntake): string {
    return normalizeDateTime(intake.intakeDate);
  }

  @ResolveField()
  history(@Ctx() ctx: RequestContext, @Parent() intake: ConsignmentIntake) {
    return this.historyService.getHistoryForObject(ctx, "INTAKE", intake.id);
  }
}

@Resolver("ConsignmentSold")
export class ConsignmentSoldFieldResolver {
  constructor(private readonly historyService: ConsignmentHistoryService) {}

  @ResolveField()
  soldDate(@Parent() sold: ConsignmentSold): string {
    return normalizeDateTime(sold.soldDate);
  }

  @ResolveField()
  history(@Ctx() ctx: RequestContext, @Parent() sold: ConsignmentSold) {
    return this.historyService.getHistoryForObject(ctx, "SOLD", sold.id);
  }
}

@Resolver("ConsignmentPayment")
export class ConsignmentPaymentFieldResolver {
  constructor(private readonly historyService: ConsignmentHistoryService) {}

  @ResolveField()
  paymentDate(@Parent() payment: ConsignmentPayment): string {
    return normalizeDateTime(payment.paymentDate);
  }

  @ResolveField()
  history(@Ctx() ctx: RequestContext, @Parent() payment: ConsignmentPayment) {
    return this.historyService.getHistoryForObject(ctx, "PAYMENT", payment.id);
  }
}

@Resolver("ConsignmentReturn")
export class ConsignmentReturnFieldResolver {
  constructor(private readonly historyService: ConsignmentHistoryService) {}

  @ResolveField()
  returnedDate(@Parent() consignmentReturn: ConsignmentReturn): string {
    return normalizeDateTime(consignmentReturn.returnedDate);
  }

  @ResolveField()
  history(
    @Ctx() ctx: RequestContext,
    @Parent() consignmentReturn: ConsignmentReturn,
  ) {
    return this.historyService.getHistoryForObject(
      ctx,
      "RETURN",
      consignmentReturn.id,
    );
  }
}

@Resolver("ConsignmentSettlement")
export class ConsignmentSettlementFieldResolver {
  constructor(private readonly historyService: ConsignmentHistoryService) {}

  @ResolveField()
  settlementDate(@Parent() settlement: ConsignmentSettlement): string {
    return normalizeDateTime(settlement.settlementDate);
  }

  @ResolveField()
  history(
    @Ctx() ctx: RequestContext,
    @Parent() settlement: ConsignmentSettlement,
  ) {
    return this.historyService.getHistoryForObject(
      ctx,
      "SETTLEMENT",
      settlement.id,
    );
  }

  @ResolveField()
  approvedAt(@Parent() settlement: ConsignmentSettlement): string | null {
    return settlement.approvedAt
      ? normalizeDateTime(settlement.approvedAt)
      : null;
  }

  @ResolveField()
  paidAt(@Parent() settlement: ConsignmentSettlement): string | null {
    return settlement.paidAt ? normalizeDateTime(settlement.paidAt) : null;
  }

  @ResolveField()
  closedAt(@Parent() settlement: ConsignmentSettlement): string | null {
    return settlement.closedAt ? normalizeDateTime(settlement.closedAt) : null;
  }
}
