import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import { Customer, EntityId, Money, VendureEntity } from "@vendure/core";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { ConsignmentPaymentItem } from "./consignment-payment-item.entity";

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

  /** Sum of all items' subtotals */
  @Money()
  subtotal: number;

  @Money()
  discount: number;

  /** subtotal - discount */
  @Money()
  total: number;

  @Money()
  paidAmount: number;

  /** total - paidAmount */
  @Money()
  remainingAmount: number;

  @OneToMany(() => ConsignmentPaymentItem, (item) => item.payment, {
    cascade: true,
    eager: false,
  })
  items: ConsignmentPaymentItem[];
}
