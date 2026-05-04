import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillConsignmentCurrency1777400000001 implements MigrationInterface {
    name = 'BackfillConsignmentCurrency1777400000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Backfill quotation currency from product_variant_price (pick first price row per variant)
        await queryRunner.query(`
            UPDATE "consignment_quotation" q
            SET "currency" = subq."currencyCode"
            FROM (
                SELECT DISTINCT ON ("variantId") "variantId", "currencyCode"
                FROM "product_variant_price"
                ORDER BY "variantId", "createdAt"
            ) subq
            WHERE q."productVariantId" = subq."variantId"
              AND (q."currency" = '' OR q."currency" IS NULL)
        `);

        // Remaining quotations with no variant price row: set empty string default
        await queryRunner.query(`
            UPDATE "consignment_quotation"
            SET "currency" = ''
            WHERE "currency" IS NULL
        `);

        // Propagate from quotation to intake items
        await queryRunner.query(`
            UPDATE "consignment_intake_item" ii
            SET "currency" = q."currency"
            FROM "consignment_quotation" q
            WHERE ii."quotationId" = q."id"
              AND (ii."currency" = '' OR ii."currency" IS NULL)
        `);

        // Propagate from quotation to payment items
        await queryRunner.query(`
            UPDATE "consignment_payment_item" pi
            SET "currency" = q."currency"
            FROM "consignment_quotation" q
            WHERE pi."quotationId" = q."id"
              AND (pi."currency" = '' OR pi."currency" IS NULL)
        `);

        // Propagate from quotation to return items
        await queryRunner.query(`
            UPDATE "consignment_return_item" ri
            SET "currency" = q."currency"
            FROM "consignment_quotation" q
            WHERE ri."quotationId" = q."id"
              AND (ri."currency" = '' OR ri."currency" IS NULL)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "consignment_quotation" SET "currency" = ''`);
        await queryRunner.query(`UPDATE "consignment_intake_item" SET "currency" = ''`);
        await queryRunner.query(`UPDATE "consignment_payment_item" SET "currency" = ''`);
        await queryRunner.query(`UPDATE "consignment_return_item" SET "currency" = ''`);
    }
}
