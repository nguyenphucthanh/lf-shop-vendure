import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { EntityId, Money, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';

import { ConsignmentPayment } from './consignment-payment.entity';
import { ConsignmentQuotation } from './consignment-quotation.entity';

@Entity()
export class ConsignmentPaymentItem extends VendureEntity {
    constructor(input?: DeepPartial<ConsignmentPaymentItem>) {
        super(input);
    }

    @EntityId()
    paymentId: ID;

    @ManyToOne(() => ConsignmentPayment, payment => payment.items, { onDelete: 'CASCADE' })
    payment: ConsignmentPayment;

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
