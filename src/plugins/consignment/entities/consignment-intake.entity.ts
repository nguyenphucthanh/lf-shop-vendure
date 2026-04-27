import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import { Customer, EntityId, Money, VendureEntity } from "@vendure/core";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { ConsignmentIntakeItem } from "./consignment-intake-item.entity";

@Entity()
export class ConsignmentIntake extends VendureEntity {
  constructor(input?: DeepPartial<ConsignmentIntake>) {
    super(input);
  }

  @EntityId()
  storeId: ID;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  store: Customer;

  @Column({ type: "date" })
  intakeDate: Date;

  @Column({ nullable: true, type: "varchar" })
  paymentPolicy: string | null;

  @Column({ nullable: true, type: "varchar" })
  deliveryMethod: string | null;

  @Column({ nullable: true, type: "varchar" })
  deliveryTrackingCode: string | null;

  @Money()
  deliveryCost: number;

  /** Total = sum of all items' subtotals + deliveryCost */
  @Money()
  total: number;

  @OneToMany(() => ConsignmentIntakeItem, (item) => item.intake, {
    cascade: true,
    eager: false,
  })
  items: ConsignmentIntakeItem[];
}
