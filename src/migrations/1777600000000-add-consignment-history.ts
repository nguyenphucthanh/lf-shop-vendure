import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConsignmentHistory1777600000000 implements MigrationInterface {
  name = "AddConsignmentHistory1777600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "consignment_history_entry" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "id" SERIAL NOT NULL,
        "storeId" integer NOT NULL,
        "objectType" character varying(20) NOT NULL,
        "objectId" integer NOT NULL,
        "type" character varying(20) NOT NULL,
        "actorUserId" integer,
        "actorIdentifier" character varying,
        "changes" text,
        "note" text,
        "data" text,
        CONSTRAINT "PK_consignment_history_entry" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_consignment_history_object"
      ON "consignment_history_entry" ("objectType", "objectId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_consignment_history_store"
      ON "consignment_history_entry" ("storeId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_consignment_history_store"`);
    await queryRunner.query(`DROP INDEX "idx_consignment_history_object"`);
    await queryRunner.query(`DROP TABLE "consignment_history_entry"`);
  }
}