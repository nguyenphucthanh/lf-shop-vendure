import { MigrationInterface, QueryRunner } from "typeorm";

export class SplitConsignmentSoldAndPayment1777500000000 implements MigrationInterface {
  name = "SplitConsignmentSoldAndPayment1777500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "consignment_sold" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "storeId" integer NOT NULL,
                "soldDate" date NOT NULL,
                "total" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_sold" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "consignment_sold"
            ADD CONSTRAINT "FK_consignment_sold_store"
            FOREIGN KEY ("storeId") REFERENCES "customer"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            CREATE TABLE "consignment_sold_item" (
              "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
              "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
              "id" SERIAL NOT NULL,
              "soldId" integer NOT NULL,
              "quotationId" integer NOT NULL,
              "currency" character varying NOT NULL DEFAULT '',
              "productPriceSnapshot" integer NOT NULL DEFAULT 0,
              "consignmentPriceSnapshot" integer NOT NULL DEFAULT 0,
              "quantity" integer NOT NULL,
              "subtotal" integer NOT NULL DEFAULT 0,
              CONSTRAINT "PK_consignment_sold_item" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "consignment_sold_item"
            ADD CONSTRAINT "FK_consignment_sold_item_sold"
            FOREIGN KEY ("soldId") REFERENCES "consignment_sold"("id") ON DELETE CASCADE
          `);

        await queryRunner.query(`
            ALTER TABLE "consignment_sold_item"
            ADD CONSTRAINT "FK_consignment_sold_item_quotation"
            FOREIGN KEY ("quotationId") REFERENCES "consignment_quotation"("id") ON DELETE RESTRICT
          `);

        // Backfill one sold header per legacy payment containing item rows.
    await queryRunner.query(`
            INSERT INTO "consignment_sold" (
              "id",
                "createdAt",
                "updatedAt",
                "storeId",
                "soldDate",
                "total"
            )
            SELECT
              p."id",
              p."createdAt",
              p."updatedAt",
                p."storeId",
                p."paymentDate",
              COALESCE(SUM(pi."subtotal"), 0)
            FROM "consignment_payment" p
            INNER JOIN "consignment_payment_item" pi ON pi."paymentId" = p."id"
            GROUP BY p."id", p."createdAt", p."updatedAt", p."storeId", p."paymentDate"
        `);

        await queryRunner.query(`
            SELECT setval(
              pg_get_serial_sequence('"consignment_sold"', 'id'),
              COALESCE((SELECT MAX("id") FROM "consignment_sold"), 1),
              true
            )
          `);

        // Backfill sold items from legacy payment items.
        await queryRunner.query(`
            INSERT INTO "consignment_sold_item" (
              "createdAt",
              "updatedAt",
              "soldId",
              "quotationId",
              "currency",
              "productPriceSnapshot",
              "consignmentPriceSnapshot",
              "quantity",
              "subtotal"
            )
            SELECT
              pi."createdAt",
              pi."updatedAt",
              pi."paymentId",
              pi."quotationId",
              pi."currency",
              pi."productPriceSnapshot",
              pi."consignmentPriceSnapshot",
              pi."quantity",
              pi."subtotal"
            FROM "consignment_payment_item" pi
            INNER JOIN "consignment_sold" s ON s."id" = pi."paymentId"
          `);

    await queryRunner.query(
      `ALTER TABLE "consignment_payment" ADD "soldId" integer`,
    );

        await queryRunner.query(`
            UPDATE "consignment_payment" p
            SET "soldId" = p."id"
            WHERE EXISTS (
              SELECT 1
              FROM "consignment_sold" s
              WHERE s."id" = p."id"
            )
          `);

    await queryRunner.query(`
            ALTER TABLE "consignment_payment"
            ADD CONSTRAINT "FK_consignment_payment_sold"
            FOREIGN KEY ("soldId") REFERENCES "consignment_sold"("id") ON DELETE SET NULL
        `);

    await queryRunner.query(
      `ALTER TABLE "consignment_payment" DROP COLUMN "paidAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consignment_payment" DROP COLUMN "remainingAmount"`,
    );

    await queryRunner.query(`DROP TABLE "consignment_payment_item"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "consignment_payment_item" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "paymentId" integer NOT NULL,
                "quotationId" integer NOT NULL,
                "currency" character varying NOT NULL DEFAULT '',
                "productPriceSnapshot" integer NOT NULL DEFAULT 0,
                "consignmentPriceSnapshot" integer NOT NULL DEFAULT 0,
                "quantity" integer NOT NULL,
                "subtotal" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_payment_item" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "consignment_payment_item"
            ADD CONSTRAINT "FK_consignment_payment_item_payment"
            FOREIGN KEY ("paymentId") REFERENCES "consignment_payment"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "consignment_payment_item"
            ADD CONSTRAINT "FK_consignment_payment_item_quotation"
            FOREIGN KEY ("quotationId") REFERENCES "consignment_quotation"("id") ON DELETE RESTRICT
        `);

        await queryRunner.query(`
            INSERT INTO "consignment_payment_item" (
              "createdAt",
              "updatedAt",
              "paymentId",
              "quotationId",
              "currency",
              "productPriceSnapshot",
              "consignmentPriceSnapshot",
              "quantity",
              "subtotal"
            )
            SELECT
              si."createdAt",
              si."updatedAt",
              p."id",
              si."quotationId",
              si."currency",
              si."productPriceSnapshot",
              si."consignmentPriceSnapshot",
              si."quantity",
              si."subtotal"
            FROM "consignment_payment" p
            INNER JOIN "consignment_sold" s ON s."id" = p."soldId"
            INNER JOIN "consignment_sold_item" si ON si."soldId" = s."id"
          `);

    await queryRunner.query(
      `ALTER TABLE "consignment_payment" ADD "paidAmount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "consignment_payment" ADD "remainingAmount" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE "consignment_payment" DROP CONSTRAINT "FK_consignment_payment_sold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consignment_payment" DROP COLUMN "soldId"`,
    );

    await queryRunner.query(`DROP TABLE "consignment_sold_item"`);
    await queryRunner.query(`DROP TABLE "consignment_sold"`);
  }
}
