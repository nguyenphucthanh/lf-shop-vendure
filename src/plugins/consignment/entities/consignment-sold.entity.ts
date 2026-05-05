import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Customer, EntityId, Money, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { ConsignmentSoldItem } from './consignment-sold-item.entity';

@Entity()
export class ConsignmentSold extends VendureEntity {
    constructor(input?: DeepPartial<ConsignmentSold>) {
        super(input);
    }

    @EntityId()
    storeId: ID;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    store: Customer;

    @Column({ type: 'date' })
    soldDate: Date;

    @OneToMany(() => ConsignmentSoldItem, item => item.sold)
    items: ConsignmentSoldItem[];

    @Money()
    total: number;
}