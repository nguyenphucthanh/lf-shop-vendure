import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import type { RequestContext } from "@vendure/core";
import { Product, ProductVariant } from "@vendure/core";
import { UserInputError } from "@vendure/core";

import { ConsignmentIntake } from "../src/plugins/consignment/entities/consignment-intake.entity";
import { ConsignmentIntakeItem } from "../src/plugins/consignment/entities/consignment-intake-item.entity";
import { ConsignmentPayment } from "../src/plugins/consignment/entities/consignment-payment.entity";
import { ConsignmentQuotation } from "../src/plugins/consignment/entities/consignment-quotation.entity";
import { ConsignmentReturn } from "../src/plugins/consignment/entities/consignment-return.entity";
import { ConsignmentReturnItem } from "../src/plugins/consignment/entities/consignment-return-item.entity";
import { ConsignmentSoldItem } from "../src/plugins/consignment/entities/consignment-sold-item.entity";
import { ConsignmentSold } from "../src/plugins/consignment/entities/consignment-sold.entity";
import { ConsignmentHistoryService } from "../src/plugins/consignment/services/consignment-history.service";
import { ConsignmentIntakeService } from "../src/plugins/consignment/services/consignment-intake.service";
import { ConsignmentPaymentService } from "../src/plugins/consignment/services/consignment-payment.service";
import { ConsignmentReportService } from "../src/plugins/consignment/services/consignment-report.service";
import { ConsignmentReturnService } from "../src/plugins/consignment/services/consignment-return.service";
import { ConsignmentSoldService } from "../src/plugins/consignment/services/consignment-sold.service";

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
  andWhere: (
    query: string,
    params?: Record<string, unknown>,
  ) => QueryBuilderStub;
  select: (selection: string, alias?: string) => QueryBuilderStub;
  addSelect: (selection: string, alias?: string) => QueryBuilderStub;
  groupBy: (group: string) => QueryBuilderStub;
  getRawOne: () => Promise<Record<string, string>>;
  getRawMany: () => Promise<Array<Record<string, string>>>;
};

class FakeConnection {
  constructor(
    private readonly repositories: Map<Function, RepoStub>,
    private readonly entityLoaders: Map<
      Function,
      (id: string) => Promise<any>
    > = new Map(),
  ) {}

  getRepository(_ctx: RequestContext, entity: Function): RepoStub {
    const repo = this.repositories.get(entity);
    if (!repo) {
      throw new Error(`Missing repository for ${entity.name}`);
    }
    return repo;
  }

  async getEntityOrThrow(
    _ctx: RequestContext,
    entity: Function,
    id: string,
  ): Promise<any> {
    const loader = this.entityLoaders.get(entity);
    if (!loader) {
      throw new Error(`Missing entity loader for ${entity.name}`);
    }
    return loader(id);
  }
}

function createRepoMap(
  entries: Array<[Function, RepoStub]>,
): Map<Function, RepoStub> {
  return new Map<Function, RepoStub>(entries);
}

function getLast<T>(values: T[]): T | undefined {
  return values[values.length - 1];
}

function createHistoryServiceStub(): Pick<
  ConsignmentHistoryService,
  "record" | "buildChanges" | "toHistoryValue"
> {
  return {
    record: async () => ({ id: "history-1" }) as never,
    buildChanges: () => [],
    toHistoryValue: (value: unknown) => {
      if (value === undefined) {
        return null;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (Array.isArray(value)) {
        return value.map((item) => item as never) as never;
      }
      return value as never;
    },
  };
}

function createStockLevelServiceStub() {
  return {
    updateStockOnHandForLocation: async () => undefined,
  };
}

function createStockLocationServiceStub() {
  return {
    defaultStockLocation: async () => ({ id: "location-1" }),
  };
}

const ctx = {} as RequestContext;

test("intake create should keep total as item subtotal only", async () => {
  const savedIntakes: Array<Record<string, unknown>> = [];
  let nextId = 1;

  const intakeRepo: RepoStub = {
    create: (input) => ({ ...input }),
    save: async (input) => {
      if (!input.id) {
        input.id = `${nextId++}`;
      }
      savedIntakes.push({ ...input });
      return input;
    },
  };

  const itemRepo: RepoStub = {
    create: (input) => ({ ...input }),
    save: async (input) => ({ id: "item-1", ...input }),
  };

  const quotationRepo: RepoStub = {
    findOne: async () => ({
      id: "quotation-1",
      currency: "USD",
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
    createStockLevelServiceStub() as never,
    createStockLocationServiceStub() as never,
    createHistoryServiceStub() as never,
  );
  service.findOne = async () => ({ id: "1" }) as ConsignmentIntake;

  await service.create(ctx, {
    storeId: "store-1",
    intakeDate: new Date("2026-01-01T00:00:00.000Z"),
    deliveryCost: 250,
    items: [{ quotationId: "quotation-1", quantity: 2 }],
  });

  assert.equal(getLast(savedIntakes)?.total, 1000);
});

test("intake update should not change total when only delivery cost changes", async () => {
  const savedIntakes: Array<Record<string, unknown>> = [];

  const intakeRepo: RepoStub = {
    findOne: async () => ({
      id: "intake-1",
      storeId: "store-1",
      deliveryCost: 100,
      total: 1100,
    }),
    save: async (input) => {
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
    createStockLevelServiceStub() as never,
    createStockLocationServiceStub() as never,
    createHistoryServiceStub() as never,
  );
  service.findOne = async () => ({ id: "intake-1" }) as ConsignmentIntake;

  await service.update(ctx, {
    id: "intake-1",
    deliveryCost: 200,
  });

  assert.equal(getLast(savedIntakes)?.total, 1100);
});

test("intake update should replace items without saving stale item relations", async () => {
  const savedIntakes: Array<Record<string, unknown>> = [];
  const savedItems: Array<Record<string, unknown>> = [];

  const intakeRepo: RepoStub = {
    findOne: async () => ({
      id: "intake-1",
      storeId: "store-1",
      deliveryCost: 100,
      total: 1100,
    }),
    save: async (input) => {
      savedIntakes.push({ ...input });
      assert.equal("items" in input, false);
      return input;
    },
  };

  const itemRepo: RepoStub = {
    find: async () => [
      {
        id: "item-old-1",
        intakeId: "intake-1",
        quotationId: "quotation-1",
        quantity: 1,
      },
    ],
    delete: async () => undefined,
    create: (input) => ({ ...input }),
    save: async (input) => {
      savedItems.push({ ...input });
      return input;
    },
  };

  const quotationRepo: RepoStub = {
    findOne: async () => ({
      id: "quotation-1",
      storeId: "store-1",
      currency: "USD",
      consignmentPrice: 500,
      productVariant: { id: "variant-1", priceWithTax: 1200 },
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
    createStockLevelServiceStub() as never,
    createStockLocationServiceStub() as never,
    createHistoryServiceStub() as never,
  );
  service.findOne = async () =>
    ({
      id: "intake-1",
      storeId: "store-1",
      intakeDate: new Date("2026-01-01T00:00:00.000Z"),
      deliveryCost: 100,
      total: 1500,
      items: [
        {
          quotationId: "quotation-1",
          quantity: 2,
          consignmentPriceSnapshot: 500,
          currency: "USD",
        },
      ],
    }) as ConsignmentIntake;

  await service.update(ctx, {
    id: "intake-1",
    items: [{ quotationId: "quotation-1", quantity: 3 }],
  });

  assert.equal(savedItems.length, 1);
  assert.equal(savedItems[0]?.intakeId, "intake-1");
  assert.equal(getLast(savedIntakes)?.total, 1500);
});

test("sold create should reject quantity that exceeds available aggregate", async () => {
  const service = new ConsignmentSoldService(
    new FakeConnection(
      createRepoMap([
        [
          ConsignmentSold,
          {
            create: (input: RepoRecord) => ({ ...input }),
            save: async (input: RepoRecord) => ({ id: "sold-1", ...input }),
          },
        ],
        [
          ConsignmentSoldItem,
          {
            create: (input: RepoRecord) => ({ ...input }),
            save: async (input: RepoRecord) => input,
            createQueryBuilder: () => createSumQueryBuilder(0),
          },
        ],
        [
          ConsignmentIntakeItem,
          { createQueryBuilder: () => createSumQueryBuilder(5) },
        ],
        [
          ConsignmentReturnItem,
          { createQueryBuilder: () => createSumQueryBuilder(0) },
        ],
        [
          ConsignmentQuotation,
          {
            findOne: async () => ({
              id: "quotation-1",
              storeId: "store-1",
              currency: "USD",
              consignmentPrice: 100,
              productVariant: { priceWithTax: 200 },
            }),
          },
        ],
      ]),
    ) as never,
    createHistoryServiceStub() as never,
  );
  service.findOne = async () => ({ id: "sold-1" }) as ConsignmentSold;

  await assert.rejects(
    service.create(ctx, {
      storeId: "store-1",
      soldDate: new Date("2026-01-01T00:00:00.000Z"),
      items: [{ quotationId: "quotation-1", quantity: 6 }],
    }),
    UserInputError,
  );
});

test("return create should reject duplicate quotation rows that exceed available quantity in aggregate", async () => {
  const service = new ConsignmentReturnService(
    new FakeConnection(
      createRepoMap([
        [
          ConsignmentReturn,
          {
            create: (input: RepoRecord) => ({ ...input }),
            save: async (input: RepoRecord) => ({ id: "return-1", ...input }),
          },
        ],
        [
          ConsignmentReturnItem,
          {
            create: (input: RepoRecord) => ({ ...input }),
            save: async (input: RepoRecord) => input,
            createQueryBuilder: () => createSumQueryBuilder(0),
          },
        ],
        [
          ConsignmentIntakeItem,
          { createQueryBuilder: () => createSumQueryBuilder(5) },
        ],
        [
          ConsignmentSoldItem,
          { createQueryBuilder: () => createSumQueryBuilder(0) },
        ],
        [
          ConsignmentQuotation,
          {
            findOne: async () => ({
              id: "quotation-1",
              currency: "USD",
              consignmentPrice: 100,
              productVariant: { priceWithTax: 200 },
            }),
          },
        ],
      ]),
    ) as never,
    createStockLevelServiceStub() as never,
    createStockLocationServiceStub() as never,
    createHistoryServiceStub() as never,
  );
  service.findOne = async () => ({ id: "return-1" }) as ConsignmentReturn;

  await assert.rejects(
    service.create(ctx, {
      storeId: "store-1",
      returnedDate: new Date("2026-01-01T00:00:00.000Z"),
      items: [
        { quotationId: "quotation-1", quantity: 3 },
        { quotationId: "quotation-1", quantity: 3 },
      ],
    }),
    UserInputError,
  );
});

test("return update should replace items without saving stale item relations", async () => {
  const savedReturns: Array<Record<string, unknown>> = [];
  const savedItems: Array<Record<string, unknown>> = [];

  const returnRepo: RepoStub = {
    findOne: async () => ({
      id: "return-1",
      storeId: "store-1",
      returnedDate: new Date("2026-01-01T00:00:00.000Z"),
      reason: null,
      total: 1000,
    }),
    save: async (input) => {
      savedReturns.push({ ...input });
      assert.equal("items" in input, false);
      return input;
    },
  };

  const itemRepo: RepoStub = {
    find: async () => [
      {
        id: "return-item-old-1",
        consignmentReturnId: "return-1",
        quotationId: "quotation-1",
        quantity: 1,
      },
    ],
    createQueryBuilder: () => createSumQueryBuilder(0),
    delete: async () => undefined,
    create: (input) => ({ ...input }),
    save: async (input) => {
      savedItems.push({ ...input });
      return input;
    },
  };

  const quotationRepo: RepoStub = {
    findOne: async () => ({
      id: "quotation-1",
      storeId: "store-1",
      currency: "USD",
      consignmentPrice: 500,
      productVariant: { id: "variant-1", priceWithTax: 1200 },
    }),
  };

  const service = new ConsignmentReturnService(
    new FakeConnection(
      createRepoMap([
        [ConsignmentReturn, returnRepo],
        [ConsignmentReturnItem, itemRepo],
        [
          ConsignmentIntakeItem,
          { createQueryBuilder: () => createSumQueryBuilder(5) },
        ],
        [
          ConsignmentSoldItem,
          { createQueryBuilder: () => createSumQueryBuilder(0) },
        ],
        [ConsignmentQuotation, quotationRepo],
      ]),
    ) as never,
    createStockLevelServiceStub() as never,
    createStockLocationServiceStub() as never,
    createHistoryServiceStub() as never,
  );
  service.findOne = async () =>
    ({
      id: "return-1",
      storeId: "store-1",
      returnedDate: new Date("2026-01-01T00:00:00.000Z"),
      reason: null,
      total: 1500,
      items: [
        {
          quotationId: "quotation-1",
          quantity: 2,
          consignmentPriceSnapshot: 500,
          currency: "USD",
        },
      ],
    }) as ConsignmentReturn;

  await service.update(ctx, {
    id: "return-1",
    items: [{ quotationId: "quotation-1", quantity: 3 }],
  });

  assert.equal(savedItems.length, 1);
  assert.equal(savedItems[0]?.consignmentReturnId, "return-1");
  assert.equal(getLast(savedReturns)?.total, 1500);
});

test("consignment services should not rely on id-only record lookups for store-scoped resources", () => {
  const serviceFiles = [
    path.resolve(
      "src/plugins/consignment/services/consignment-quotation.service.ts",
    ),
    path.resolve(
      "src/plugins/consignment/services/consignment-intake.service.ts",
    ),
    path.resolve(
      "src/plugins/consignment/services/consignment-sold.service.ts",
    ),
    path.resolve(
      "src/plugins/consignment/services/consignment-payment.service.ts",
    ),
    path.resolve(
      "src/plugins/consignment/services/consignment-return.service.ts",
    ),
  ];

  for (const filePath of serviceFiles) {
    const source = fs.readFileSync(filePath, "utf8");

    assert.doesNotMatch(
      source,
      /where:\s*\{\s*id\s*\}/,
      `${path.basename(filePath)} still has an id-only repository lookup`,
    );
    assert.doesNotMatch(
      source,
      /getEntityOrThrow\(ctx,\s*[^,]+,\s*(?:input\.)?id\)/,
      `${path.basename(filePath)} still loads entities by id without store scoping`,
    );
  }
});

test("report service should not issue aggregate queries per quotation row", async () => {
  let aggregateQueryCount = 0;
  const quotationRepo: RepoStub = {
    find: async () => [
      createQuotation("quotation-1", "variant-1"),
      createQuotation("quotation-2", "variant-2"),
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
        [ConsignmentSoldItem, aggregateRepo],
        [ConsignmentReturnItem, aggregateRepo],
      ]),
    ) as never,
  );

  await service.getReport(ctx, "store-1");

  assert.ok(
    aggregateQueryCount <= 3,
    `expected at most 3 aggregate queries per report, received ${aggregateQueryCount}`,
  );
});

test("history service should build changes only for modified fields", () => {
  const service = new ConsignmentHistoryService({} as never);

  const changes = service.buildChanges(
    {
      paymentPolicy: "Pay later",
      total: 1000,
      items: [{ quotationId: "quotation-1", quantity: 2 }],
    },
    {
      paymentPolicy: "Pay now",
      total: 1000,
      items: [{ quotationId: "quotation-1", quantity: 3 }],
    },
  );

  assert.deepEqual(changes, [
    {
      field: "paymentPolicy",
      before: "Pay later",
      after: "Pay now",
    },
    {
      field: "items",
      before: [{ quotationId: "quotation-1", quantity: 2 }],
      after: [{ quotationId: "quotation-1", quantity: 3 }],
    },
  ]);
});

test("history service should normalize nested values into history-safe data", () => {
  const service = new ConsignmentHistoryService({} as never);
  const normalized = service.toHistoryValue({
    intakeDate: new Date("2026-01-02T00:00:00.000Z"),
    items: [
      {
        quotationId: "quotation-1",
        quantity: 2,
      },
    ],
    optionalField: undefined,
  });

  assert.deepEqual(normalized, {
    intakeDate: "2026-01-02T00:00:00.000Z",
    items: [
      {
        quotationId: "quotation-1",
        quantity: 2,
      },
    ],
    optionalField: null,
  });
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
    getRawMany: async () => [
      { qty: String(total), quotationId: "quotation-1" },
    ],
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
      { quotationId: "quotation-1", qty: String(qty) },
      { quotationId: "quotation-2", qty: String(qty) },
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
  quotation.storeId = "store-1";
  quotation.productVariantId = productVariantId;
  quotation.currency = "USD";
  quotation.consignmentPrice = 100;
  quotation.note = null;
  quotation.productVariant = variant;
  return quotation;
}

function toLocaleString(value: string): Product["name"] {
  return value as unknown as Product["name"];
}
