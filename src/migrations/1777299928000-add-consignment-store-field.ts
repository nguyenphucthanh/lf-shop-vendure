import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsignmentStoreField1777299928000 implements MigrationInterface {
    name = 'AddConsignmentStoreField1777299928000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsConsignmentstore" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsConsignmentstore"`);
    }
}
