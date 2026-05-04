import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { EntityId, Money, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';

import { ConsignmentIntake } from './consignment-intake.entity';
import { ConsignmentQuotation } from './consignment-quotation.entity';

@Entity()
export class ConsignmentIntakeItem extends VendureEntity {
    constructor(input?: DeepPartial<ConsignmentIntakeItem>) {
        super(input);
    }

    @EntityId()
    intakeId: ID;

    @ManyToOne(() => ConsignmentIntake, intake => intake.items, { onDelete: 'CASCADE' })
    intake: ConsignmentIntake;

    @EntityId()
    quotationId: ID;

    @ManyToOne(() => ConsignmentQuotation, { onDelete: 'RESTRICT' })
    quotation: ConsignmentQuotation;

    @Column({ type: 'varchar', default: '' })
    currency: string;

    /** Snapshot of the product variant price at time of intake */
    @Money()
    productPriceSnapshot: number;

    /** Snapshot of the quotation's consignment price at time of intake */
    @Money()
    consignmentPriceSnapshot: number;

    @Column({ type: 'int' })
    quantity: number;

    /** consignmentPriceSnapshot × quantity */
    @Money()
    subtotal: number;
}
