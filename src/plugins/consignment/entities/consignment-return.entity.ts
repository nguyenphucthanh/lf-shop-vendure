import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Customer, EntityId, Money, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { ConsignmentReturnItem } from './consignment-return-item.entity';

@Entity()
export class ConsignmentReturn extends VendureEntity {
    constructor(input?: DeepPartial<ConsignmentReturn>) {
        super(input);
    }

    @EntityId()
    storeId: ID;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    store: Customer;

    @Column({ type: 'date' })
    returnedDate: Date;

    @Column({ nullable: true, type: 'varchar' })
    reason: string | null;

    @Money()
    total: number;

    @OneToMany(() => ConsignmentReturnItem, item => item.consignmentReturn, { cascade: true, eager: false })
    items: ConsignmentReturnItem[];
}
