import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import type { RequestContext } from '@vendure/core';
import { Product, ProductVariant } from '@vendure/core';
import { UserInputError } from '@vendure/core';

import { ConsignmentIntake } from '../src/plugins/consignment/entities/consignment-intake.entity';
import { ConsignmentIntakeItem } from '../src/plugins/consignment/entities/consignment-intake-item.entity';
import { ConsignmentPayment } from '../src/plugins/consignment/entities/consignment-payment.entity';
import { ConsignmentPaymentItem } from '../src/plugins/consignment/entities/consignment-payment-item.entity';
import { ConsignmentQuotation } from '../src/plugins/consignment/entities/consignment-quotation.entity';
import { ConsignmentReturn } from '../src/plugins/consignment/entities/consignment-return.entity';
import { ConsignmentReturnItem } from '../src/plugins/consignment/entities/consignment-return-item.entity';
import { ConsignmentIntakeService } from '../src/plugins/consignment/services/consignment-intake.service';
import { ConsignmentPaymentService } from '../src/plugins/consignment/services/consignment-payment.service';
import { ConsignmentReportService } from '../src/plugins/consignment/services/consignment-report.service';
import { ConsignmentReturnService } from '../src/plugins/consignment/services/consignment-return.service';

type RepoRecord = Record<string, unknown>;

type RepoStub = {
    create?: (input: RepoRecord) => RepoRecord;
    save?: (input: RepoRecord) => Promise<RepoRecord>;
    findOne?: (options: unknown) => Promise<unknown>;
    find?: (options: unknown) => Promise<unknown[]>;
    delete?: (criteria: unknown) => Promise<unknown>;
    remove?: (entity: unknown) => Promise<unknown>;
    createQueryBuilder?: (alias: string) => QueryBuilderStub;
};

type QueryBuilderStub = {
    innerJoin: (property: string, alias: string) => QueryBuilderStub;
    where: (query: string, params?: Record<string, unknown>) => QueryBuilderStub;
    andWhere: (query: string, params?: Record<string, unknown>) => QueryBuilderStub;
    select: (selection: string, alias?: string) => QueryBuilderStub;
    addSelect: (selection: string, alias?: string) => QueryBuilderStub;
    groupBy: (group: string) => QueryBuilderStub;
    getRawOne: () => Promise<Record<string, string>>;
    getRawMany: () => Promise<Array<Record<string, string>>>;
};

class FakeConnection {
    constructor(
        private readonly repositories: Map<Function, RepoStub>,
        private readonly entityLoaders: Map<Function, (id: string) => Promise<any>> = new Map(),
    ) {}

    getRepository(_ctx: RequestContext, entity: Function): RepoStub {
        const repo = this.repositories.get(entity);
        if (!repo) {
            throw new Error(`Missing repository for ${entity.name}`);
        }
        return repo;
    }

    async getEntityOrThrow(_ctx: RequestContext, entity: Function, id: string): Promise<any> {
        const loader = this.entityLoaders.get(entity);
        if (!loader) {
            throw new Error(`Missing entity loader for ${entity.name}`);
        }
        return loader(id);
    }
}

function createRepoMap(entries: Array<[Function, RepoStub]>): Map<Function, RepoStub> {
    return new Map<Function, RepoStub>(entries);
}

function getLast<T>(values: T[]): T | undefined {
    return values[values.length - 1];
}

const ctx = {} as RequestContext;

test('intake create should keep total as item subtotal only', async () => {
    const savedIntakes: Array<Record<string, unknown>> = [];
    let nextId = 1;

    const intakeRepo: RepoStub = {
        create: input => ({ ...input }),
        save: async input => {
            if (!input.id) {
                input.id = `${nextId++}`;
            }
            savedIntakes.push({ ...input });
            return input;
        },
    };

    const itemRepo: RepoStub = {
        create: input => ({ ...input }),
        save: async input => ({ id: 'item-1', ...input }),
    };

    const quotationRepo: RepoStub = {
        findOne: async () => ({
            id: 'quotation-1',
            currency: 'USD',
            consignmentPrice: 500,
            productVariant: { priceWithTax: 1200 },
        }),
    };

    const service = new ConsignmentIntakeService(
        new FakeConnection(
            createRepoMap([
                [ConsignmentIntake, intakeRepo],
                [ConsignmentIntakeItem, itemRepo],
                [ConsignmentQuotation, quotationRepo],
            ]),
        ) as never,
    );
    service.findOne = async () => ({ id: '1' } as ConsignmentIntake);

    await service.create(ctx, {
        storeId: 'store-1',
        intakeDate: new Date('2026-01-01T00:00:00.000Z'),
        deliveryCost: 250,
        items: [{ quotationId: 'quotation-1', quantity: 2 }],
    });

    assert.equal(getLast(savedIntakes)?.total, 1000);
});

test('intake update should not change total when only delivery cost changes', async () => {
    const savedIntakes: Array<Record<string, unknown>> = [];

    const intakeRepo: RepoStub = {
        findOne: async () => ({
            id: 'intake-1',
            storeId: 'store-1',
            deliveryCost: 100,
            total: 1100,
        }),
        save: async input => {
            savedIntakes.push({ ...input });
            return input;
        },
    };

    const service = new ConsignmentIntakeService(
        new FakeConnection(
            createRepoMap([
                [ConsignmentIntake, intakeRepo],
                [ConsignmentIntakeItem, { delete: async () => undefined }],
                [ConsignmentQuotation, {}],
            ]),
            new Map<Function, (id: string) => Promise<unknown>>(),
        ) as never,
    );
    service.findOne = async () => ({ id: 'intake-1' } as ConsignmentIntake);

    await service.update(ctx, {
        id: 'intake-1',
        deliveryCost: 200,
    });

    assert.equal(getLast(savedIntakes)?.total, 1100);
});

test('payment create should reject duplicate quotation rows that exceed available quantity in aggregate', async () => {
    const service = new ConsignmentPaymentService(
        new FakeConnection(
            createRepoMap([
                [ConsignmentPayment, { create: (input: RepoRecord) => ({ ...input }), save: async (input: RepoRecord) => ({ id: 'payment-1', ...input }) }],
                [ConsignmentPaymentItem, {
                    create: (input: RepoRecord) => ({ ...input }),
                    save: async (input: RepoRecord) => input,
                    createQueryBuilder: () => createSumQueryBuilder(0),
                }],
                [ConsignmentIntakeItem, { createQueryBuilder: () => createSumQueryBuilder(5) }],
                [ConsignmentReturnItem, { createQueryBuilder: () => createSumQueryBuilder(0) }],
                [ConsignmentQuotation, {
                    findOne: async () => ({
                        id: 'quotation-1',
                        currency: 'USD',
                        consignmentPrice: 100,
                        productVariant: { priceWithTax: 200 },
                    }),
                }],
            ]),
        ) as never,
    );
    service.findOne = async () => ({ id: 'payment-1' } as ConsignmentPayment);

    await assert.rejects(
        service.create(ctx, {
            storeId: 'store-1',
            paymentDate: new Date('2026-01-01T00:00:00.000Z'),
            paymentMethod: 'Cash',
            paymentStatus: 'Pending',
            items: [
                { quotationId: 'quotation-1', quantity: 3 },
                { quotationId: 'quotation-1', quantity: 3 },
            ],
        }),
        UserInputError,
    );
});

test('return create should reject duplicate quotation rows that exceed available quantity in aggregate', async () => {
    const service = new ConsignmentReturnService(
        new FakeConnection(
            createRepoMap([
                [ConsignmentReturn, { create: (input: RepoRecord) => ({ ...input }), save: async (input: RepoRecord) => ({ id: 'return-1', ...input }) }],
                [ConsignmentReturnItem, {
                    create: (input: RepoRecord) => ({ ...input }),
                    save: async (input: RepoRecord) => input,
                    createQueryBuilder: () => createSumQueryBuilder(0),
                }],
                [ConsignmentIntakeItem, { createQueryBuilder: () => createSumQueryBuilder(5) }],
                [ConsignmentPaymentItem, { createQueryBuilder: () => createSumQueryBuilder(0) }],
                [ConsignmentQuotation, {
                    findOne: async () => ({
                        id: 'quotation-1',
                        currency: 'USD',
                        consignmentPrice: 100,
                        productVariant: { priceWithTax: 200 },
                    }),
                }],
            ]),
        ) as never,
    );
    service.findOne = async () => ({ id: 'return-1' } as ConsignmentReturn);

    await assert.rejects(
        service.create(ctx, {
            storeId: 'store-1',
            returnedDate: new Date('2026-01-01T00:00:00.000Z'),
            items: [
                { quotationId: 'quotation-1', quantity: 3 },
                { quotationId: 'quotation-1', quantity: 3 },
            ],
        }),
        UserInputError,
    );
});

test('consignment services should not rely on id-only record lookups for store-scoped resources', () => {
    const serviceFiles = [
        path.resolve('src/plugins/consignment/services/consignment-quotation.service.ts'),
        path.resolve('src/plugins/consignment/services/consignment-intake.service.ts'),
        path.resolve('src/plugins/consignment/services/consignment-payment.service.ts'),
        path.resolve('src/plugins/consignment/services/consignment-return.service.ts'),
    ];

    for (const filePath of serviceFiles) {
        const source = fs.readFileSync(filePath, 'utf8');

        assert.doesNotMatch(source, /where:\s*\{\s*id\s*\}/, `${path.basename(filePath)} still has an id-only repository lookup`);
        assert.doesNotMatch(source, /getEntityOrThrow\(ctx,\s*[^,]+,\s*(?:input\.)?id\)/, `${path.basename(filePath)} still loads entities by id without store scoping`);
    }
});

test('report service should not issue aggregate queries per quotation row', async () => {
    let aggregateQueryCount = 0;
    const quotationRepo: RepoStub = {
        find: async () => [
            createQuotation('quotation-1', 'variant-1'),
            createQuotation('quotation-2', 'variant-2'),
        ],
    };

    const aggregateRepo: RepoStub = {
        createQueryBuilder: () => {
            aggregateQueryCount += 1;
            return createQtyQueryBuilder(0);
        },
    };

    const service = new ConsignmentReportService(
        new FakeConnection(
            createRepoMap([
                [ConsignmentQuotation, quotationRepo],
                [ConsignmentIntakeItem, aggregateRepo],
                [ConsignmentPaymentItem, aggregateRepo],
                [ConsignmentReturnItem, aggregateRepo],
            ]),
        ) as never,
    );

    await service.getReport(ctx, 'store-1');

    assert.ok(
        aggregateQueryCount <= 3,
        `expected at most 3 aggregate queries per report, received ${aggregateQueryCount}`,
    );
});

function createSumQueryBuilder(total: number): QueryBuilderStub {
    return {
        innerJoin: () => createSumQueryBuilder(total),
        where: () => createSumQueryBuilder(total),
        andWhere: () => createSumQueryBuilder(total),
        select: () => createSumQueryBuilder(total),
        addSelect: () => createSumQueryBuilder(total),
        groupBy: () => createSumQueryBuilder(total),
        getRawOne: async () => ({ total: String(total) }),
        getRawMany: async () => [{ qty: String(total), quotationId: 'quotation-1' }],
    };
}

function createQtyQueryBuilder(qty: number): QueryBuilderStub {
    return {
        innerJoin: () => createQtyQueryBuilder(qty),
        where: () => createQtyQueryBuilder(qty),
        andWhere: () => createQtyQueryBuilder(qty),
        select: () => createQtyQueryBuilder(qty),
        addSelect: () => createQtyQueryBuilder(qty),
        groupBy: () => createQtyQueryBuilder(qty),
        getRawOne: async () => ({ qty: String(qty) }),
        getRawMany: async () => [
            { quotationId: 'quotation-1', qty: String(qty) },
            { quotationId: 'quotation-2', qty: String(qty) },
        ],
    };
}

function createQuotation(id: string, productVariantId: string) {
    const quotation = new ConsignmentQuotation();
    const product = new Product();
    const variant = new ProductVariant();

    product.name = toLocaleString(`${productVariantId}-product`);
    product.translations = [];

    variant.id = productVariantId;
    variant.sku = `${productVariantId}-sku`;
    variant.name = toLocaleString(`${productVariantId}-name`);
    variant.translations = [];
    variant.product = product;

    quotation.id = id;
    quotation.storeId = 'store-1';
    quotation.productVariantId = productVariantId;
    quotation.currency = 'USD';
    quotation.consignmentPrice = 100;
    quotation.note = null;
    quotation.productVariant = variant;
    return quotation;
}

function toLocaleString(value: string): Product['name'] {
    return value as unknown as Product['name'];
}