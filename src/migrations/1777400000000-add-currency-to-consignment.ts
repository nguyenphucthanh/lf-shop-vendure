import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyToConsignment1777400000000 implements MigrationInterface {
    name = 'AddCurrencyToConsignment1777400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consignment_quotation" ADD "currency" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "consignment_intake_item" ADD "currency" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "consignment_payment_item" ADD "currency" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "consignment_return_item" ADD "currency" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consignment_return_item" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "consignment_payment_item" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "consignment_intake_item" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "consignment_quotation" DROP COLUMN "currency"`);
    }
}
