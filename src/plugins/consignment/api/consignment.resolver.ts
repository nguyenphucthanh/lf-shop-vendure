import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Allow, Ctx, Permission, RequestContext } from "@vendure/core";

import { ConsignmentIntake } from "../entities/consignment-intake.entity";
import { ConsignmentPayment } from "../entities/consignment-payment.entity";
import { ConsignmentQuotation } from "../entities/consignment-quotation.entity";
import { ConsignmentReturn } from "../entities/consignment-return.entity";
import { ConsignmentSold } from "../entities/consignment-sold.entity";
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
    private quotationService: ConsignmentQuotationService,
    private intakeService: ConsignmentIntakeService,
    private soldService: ConsignmentSoldService,
    private paymentService: ConsignmentPaymentService,
    private returnService: ConsignmentReturnService,
    private reportService: ConsignmentReportService,
  ) {}

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
}

@Resolver("ConsignmentQuotation")
export class ConsignmentQuotationFieldResolver {
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
}

@Resolver("ConsignmentIntake")
export class ConsignmentIntakeFieldResolver {
  @ResolveField()
  intakeDate(@Parent() intake: ConsignmentIntake): string {
    return normalizeDateTime(intake.intakeDate);
  }
}

@Resolver("ConsignmentSold")
export class ConsignmentSoldFieldResolver {
  @ResolveField()
  soldDate(@Parent() sold: ConsignmentSold): string {
    return normalizeDateTime(sold.soldDate);
  }
}

@Resolver("ConsignmentPayment")
export class ConsignmentPaymentFieldResolver {
  @ResolveField()
  paymentDate(@Parent() payment: ConsignmentPayment): string {
    return normalizeDateTime(payment.paymentDate);
  }
}

@Resolver("ConsignmentReturn")
export class ConsignmentReturnFieldResolver {
  @ResolveField()
  returnedDate(@Parent() consignmentReturn: ConsignmentReturn): string {
    return normalizeDateTime(consignmentReturn.returnedDate);
  }
}
