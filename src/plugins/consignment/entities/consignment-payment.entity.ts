import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import { Customer, EntityId, Money, VendureEntity } from "@vendure/core";
import { Column, Entity, ManyToOne } from "typeorm";
import { ConsignmentSold } from "./consignment-sold.entity";

export type PaymentMethod = "Cash" | "Bank transfer";
export type PaymentStatus = "Pending" | "Completed";

@Entity()
export class ConsignmentPayment extends VendureEntity {
  constructor(input?: DeepPartial<ConsignmentPayment>) {
    super(input);
  }

  @EntityId()
  storeId: ID;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  store: Customer;

  @Column({ type: "date" })
  paymentDate: Date;

  @Column({ nullable: true, type: "varchar" })
  paymentPolicy: string | null;

  @Column({ type: "varchar" })
  paymentMethod: PaymentMethod;

  @Column({ type: "varchar" })
  paymentStatus: PaymentStatus;

  /** Financial subtotal for this payment entry */
  @Money()
  subtotal: number;

  @Money()
  discount: number;

  /** subtotal - discount */
  @Money()
  total: number;

  @EntityId({ nullable: true })
  soldId: ID | null;

  @ManyToOne(() => ConsignmentSold, { onDelete: "SET NULL", nullable: true })
  sold: ConsignmentSold | null;
}
