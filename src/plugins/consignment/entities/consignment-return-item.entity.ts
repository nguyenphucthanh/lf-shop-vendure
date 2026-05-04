import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { EntityId, Money, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';

import { ConsignmentReturn } from './consignment-return.entity';
import { ConsignmentQuotation } from './consignment-quotation.entity';

@Entity()
export class ConsignmentReturnItem extends VendureEntity {
    constructor(input?: DeepPartial<ConsignmentReturnItem>) {
        super(input);
    }

    @EntityId()
    consignmentReturnId: ID;

    @ManyToOne(() => ConsignmentReturn, ret => ret.items, { onDelete: 'CASCADE' })
    consignmentReturn: ConsignmentReturn;

    @EntityId()
    quotationId: ID;

    @ManyToOne(() => ConsignmentQuotation, { onDelete: 'RESTRICT' })
    quotation: ConsignmentQuotation;

    @Column({ type: 'varchar', default: '' })
    currency: string;

    @Money()
    productPriceSnapshot: number;

    @Money()
    consignmentPriceSnapshot: number;

    @Column({ type: 'int' })
    quantity: number;

    /** consignmentPriceSnapshot × quantity */
    @Money()
    subtotal: number;
}
