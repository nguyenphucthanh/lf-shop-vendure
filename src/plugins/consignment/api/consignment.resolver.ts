import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';

import { ConsignmentQuotationService } from '../services/consignment-quotation.service';
import { ConsignmentIntakeService } from '../services/consignment-intake.service';
import { ConsignmentPaymentService } from '../services/consignment-payment.service';
import { ConsignmentReturnService } from '../services/consignment-return.service';
import { ConsignmentReportService } from '../services/consignment-report.service';
import { ConsignmentQuotation } from '../entities/consignment-quotation.entity';
import { ConsignmentIntake } from '../entities/consignment-intake.entity';
import { ConsignmentPayment } from '../entities/consignment-payment.entity';
import { ConsignmentReturn } from '../entities/consignment-return.entity';

@Resolver()
export class ConsignmentResolver {
    constructor(
        private quotationService: ConsignmentQuotationService,
        private intakeService: ConsignmentIntakeService,
        private paymentService: ConsignmentPaymentService,
        private returnService: ConsignmentReturnService,
        private reportService: ConsignmentReportService,
    ) {}

    // ─── Quotation ────────────────────────────────────────────────────────────

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentQuotations(@Ctx() ctx: RequestContext, @Args('storeId') storeId: string) {
        return this.quotationService.findAll(ctx, storeId);
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentQuotation(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.quotationService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    createConsignmentQuotation(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.quotationService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    updateConsignmentQuotation(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.quotationService.update(ctx, input.id, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCustomer)
    deleteConsignmentQuotation(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.quotationService.delete(ctx, id);
    }

    // ─── Intake ───────────────────────────────────────────────────────────────

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentIntakes(@Ctx() ctx: RequestContext, @Args('storeId') storeId: string) {
        return this.intakeService.findAll(ctx, storeId);
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentIntake(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.intakeService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    createConsignmentIntake(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.intakeService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    updateConsignmentIntake(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.intakeService.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCustomer)
    deleteConsignmentIntake(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.intakeService.delete(ctx, id);
    }

    // ─── Payment ──────────────────────────────────────────────────────────────

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentPayments(@Ctx() ctx: RequestContext, @Args('storeId') storeId: string) {
        return this.paymentService.findAll(ctx, storeId);
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentPayment(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.paymentService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    createConsignmentPayment(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.paymentService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    updateConsignmentPayment(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.paymentService.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCustomer)
    deleteConsignmentPayment(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.paymentService.delete(ctx, id);
    }

    // ─── Return ───────────────────────────────────────────────────────────────

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentReturns(@Ctx() ctx: RequestContext, @Args('storeId') storeId: string) {
        return this.returnService.findAll(ctx, storeId);
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentReturn(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.returnService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    createConsignmentReturn(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.returnService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    updateConsignmentReturn(@Ctx() ctx: RequestContext, @Args('input') input: any) {
        return this.returnService.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCustomer)
    deleteConsignmentReturn(@Ctx() ctx: RequestContext, @Args('id') id: string) {
        return this.returnService.delete(ctx, id);
    }

    // ─── Report ───────────────────────────────────────────────────────────────

    @Query()
    @Allow(Permission.ReadCustomer)
    consignmentReport(@Ctx() ctx: RequestContext, @Args('storeId') storeId: string) {
        return this.reportService.getReport(ctx, storeId);
    }
}

// ─── Field resolvers ──────────────────────────────────────────────────────────

@Resolver('ConsignmentQuotation')
export class ConsignmentQuotationFieldResolver {
    @ResolveField()
    productVariantName(@Parent() quotation: ConsignmentQuotation): string {
        const variant = quotation.productVariant as any;
        if (!variant) {
            return '';
        }
        const translatedName = variant.name;
        if (translatedName) {
            return translatedName;
        }
        if (Array.isArray(variant.translations) && variant.translations.length > 0) {
            return variant.translations[0]?.name ?? '';
        }
        return '';
    }

    @ResolveField()
    productVariantSku(@Parent() quotation: ConsignmentQuotation): string {
        return quotation.productVariant?.sku ?? '';
    }
}
