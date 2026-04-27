import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoNotUpdateStock1777002000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "customFieldsDonotupdatestock" boolean NOT NULL DEFAULT false`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "order" DROP COLUMN IF EXISTS "customFieldsDonotupdatestock"`,
        );
    }
}
