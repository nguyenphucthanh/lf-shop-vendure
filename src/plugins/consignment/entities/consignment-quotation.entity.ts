import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Customer, EntityId, Money, ProductVariant, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

@Entity()
@Index('idx_consignment_quotation_store_variant', ['storeId', 'productVariantId'], { unique: true })
export class ConsignmentQuotation extends VendureEntity {
    constructor(input?: DeepPartial<ConsignmentQuotation>) {
        super(input);
    }

    @EntityId()
    storeId: ID;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    store: Customer;

    @EntityId()
    productVariantId: ID;

    @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
    productVariant: ProductVariant;

    @Money()
    consignmentPrice: number;

    /** Optional human-readable note */
    @Column({ nullable: true, type: 'varchar' })
    note: string | null;
}
