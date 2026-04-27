import {MigrationInterface, QueryRunner} from "typeorm";

export class AddProductVariantCost1776999726872 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "product_variant_cost" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "currencyCode" character varying NOT NULL, "id" SERIAL NOT NULL, "variantId" integer NOT NULL, "channelId" integer NOT NULL, "cost" integer NOT NULL, CONSTRAINT "PK_711516b60a3a073c7656fd27fd8" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_variant_cost_variant_channel_currency" ON "product_variant_cost" ("variantId", "channelId", "currencyCode") `, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsCostsnapshot" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" ADD COLUMN IF NOT EXISTS "customFieldsCostcurrencycodesnapshot" character varying(255)`, undefined);
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_8b982220b889a06c497e51b1249') THEN ALTER TABLE "product_variant_cost" ADD CONSTRAINT "FK_8b982220b889a06c497e51b1249" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$`, undefined);
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_6cb2530aed07c3ae47a55c8766a') THEN ALTER TABLE "product_variant_cost" ADD CONSTRAINT "FK_6cb2530aed07c3ae47a55c8766a" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant_cost" DROP CONSTRAINT IF EXISTS "FK_6cb2530aed07c3ae47a55c8766a"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant_cost" DROP CONSTRAINT IF EXISTS "FK_8b982220b889a06c497e51b1249"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsCostcurrencycodesnapshot"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_line" DROP COLUMN IF EXISTS "customFieldsCostsnapshot"`, undefined);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_product_variant_cost_variant_channel_currency"`, undefined);
        await queryRunner.query(`DROP TABLE IF EXISTS "product_variant_cost"`, undefined);
   }

}
