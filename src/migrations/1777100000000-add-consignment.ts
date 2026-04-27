import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsignment1777100000000 implements MigrationInterface {
    name = 'AddConsignment1777100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // consignment_quotation
        await queryRunner.query(`
            CREATE TABLE "consignment_quotation" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "storeId" integer NOT NULL,
                "productVariantId" integer NOT NULL,
                "consignmentPrice" integer NOT NULL DEFAULT 0,
                "note" character varying,
                CONSTRAINT "PK_consignment_quotation" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_consignment_quotation_store_variant"
            ON "consignment_quotation" ("storeId", "productVariantId")
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_quotation"
            ADD CONSTRAINT "FK_consignment_quotation_store"
            FOREIGN KEY ("storeId") REFERENCES "customer"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_quotation"
            ADD CONSTRAINT "FK_consignment_quotation_variant"
            FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE CASCADE
        `);

        // consignment_intake
        await queryRunner.query(`
            CREATE TABLE "consignment_intake" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "storeId" integer NOT NULL,
                "intakeDate" date NOT NULL,
                "paymentPolicy" character varying,
                "deliveryMethod" character varying,
                "deliveryTrackingCode" character varying,
                "deliveryCost" integer NOT NULL DEFAULT 0,
                "total" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_intake" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_intake"
            ADD CONSTRAINT "FK_consignment_intake_store"
            FOREIGN KEY ("storeId") REFERENCES "customer"("id") ON DELETE CASCADE
        `);

        // consignment_intake_item
        await queryRunner.query(`
            CREATE TABLE "consignment_intake_item" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "intakeId" integer NOT NULL,
                "quotationId" integer NOT NULL,
                "productPriceSnapshot" integer NOT NULL DEFAULT 0,
                "consignmentPriceSnapshot" integer NOT NULL DEFAULT 0,
                "quantity" integer NOT NULL,
                "subtotal" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_intake_item" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_intake_item"
            ADD CONSTRAINT "FK_consignment_intake_item_intake"
            FOREIGN KEY ("intakeId") REFERENCES "consignment_intake"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_intake_item"
            ADD CONSTRAINT "FK_consignment_intake_item_quotation"
            FOREIGN KEY ("quotationId") REFERENCES "consignment_quotation"("id") ON DELETE RESTRICT
        `);

        // consignment_payment
        await queryRunner.query(`
            CREATE TABLE "consignment_payment" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "storeId" integer NOT NULL,
                "paymentDate" date NOT NULL,
                "paymentPolicy" character varying,
                "paymentMethod" character varying NOT NULL,
                "paymentStatus" character varying NOT NULL,
                "subtotal" integer NOT NULL DEFAULT 0,
                "discount" integer NOT NULL DEFAULT 0,
                "total" integer NOT NULL DEFAULT 0,
                "paidAmount" integer NOT NULL DEFAULT 0,
                "remainingAmount" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_payment" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_payment"
            ADD CONSTRAINT "FK_consignment_payment_store"
            FOREIGN KEY ("storeId") REFERENCES "customer"("id") ON DELETE CASCADE
        `);

        // consignment_payment_item
        await queryRunner.query(`
            CREATE TABLE "consignment_payment_item" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "paymentId" integer NOT NULL,
                "quotationId" integer NOT NULL,
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

        // consignment_return
        await queryRunner.query(`
            CREATE TABLE "consignment_return" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "storeId" integer NOT NULL,
                "returnedDate" date NOT NULL,
                "reason" character varying,
                "total" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_return" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_return"
            ADD CONSTRAINT "FK_consignment_return_store"
            FOREIGN KEY ("storeId") REFERENCES "customer"("id") ON DELETE CASCADE
        `);

        // consignment_return_item
        await queryRunner.query(`
            CREATE TABLE "consignment_return_item" (
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "id" SERIAL NOT NULL,
                "consignmentReturnId" integer NOT NULL,
                "quotationId" integer NOT NULL,
                "productPriceSnapshot" integer NOT NULL DEFAULT 0,
                "consignmentPriceSnapshot" integer NOT NULL DEFAULT 0,
                "quantity" integer NOT NULL,
                "subtotal" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_consignment_return_item" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_return_item"
            ADD CONSTRAINT "FK_consignment_return_item_return"
            FOREIGN KEY ("consignmentReturnId") REFERENCES "consignment_return"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "consignment_return_item"
            ADD CONSTRAINT "FK_consignment_return_item_quotation"
            FOREIGN KEY ("quotationId") REFERENCES "consignment_quotation"("id") ON DELETE RESTRICT
        `);

        // Customer custom fields for consignment store
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsExternalid" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsDefaultdiscountpercent" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsDefaultdiscountpercent"`);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsExternalid"`);
        await queryRunner.query(`DROP TABLE "consignment_return_item"`);
        await queryRunner.query(`DROP TABLE "consignment_return"`);
        await queryRunner.query(`DROP TABLE "consignment_payment_item"`);
        await queryRunner.query(`DROP TABLE "consignment_payment"`);
        await queryRunner.query(`DROP TABLE "consignment_intake_item"`);
        await queryRunner.query(`DROP TABLE "consignment_intake"`);
        await queryRunner.query(`DROP INDEX "idx_consignment_quotation_store_variant"`);
        await queryRunner.query(`DROP TABLE "consignment_quotation"`);
    }
}
