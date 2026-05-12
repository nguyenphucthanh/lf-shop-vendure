import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConsignmentSettlement1777600000000
  implements MigrationInterface
{
  name = "AddConsignmentSettlement1777600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "consignment_settlement" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "storeId" integer NOT NULL,
        "settlementDate" date NOT NULL,
        "status" character varying NOT NULL DEFAULT 'OPEN',
        "description" text,
        "approvedAt" TIMESTAMP,
        "paidAt" TIMESTAMP,
        "closedAt" TIMESTAMP,
        CONSTRAINT "PK_consignment_settlement" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "consignment_settlement"
      ADD CONSTRAINT "FK_consignment_settlement_store"
      FOREIGN KEY ("storeId") REFERENCES "customer"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consignment_settlement_store_status"
      ON "consignment_settlement" ("storeId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consignment_settlement_store_created"
      ON "consignment_settlement" ("storeId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_consignment_settlement_store_created"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_consignment_settlement_store_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "consignment_settlement"
      DROP CONSTRAINT "FK_consignment_settlement_store"
    `);

    await queryRunner.query(`
      DROP TABLE "consignment_settlement"
    `);
  }
}
