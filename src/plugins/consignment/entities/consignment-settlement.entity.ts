import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import { Customer, EntityId, VendureEntity } from "@vendure/core";
import { Column, Entity, ManyToOne } from "typeorm";

export type SettlementStatus = "OPEN" | "APPROVED" | "PAID" | "CLOSED";

@Entity()
export class ConsignmentSettlement extends VendureEntity {
  constructor(input?: DeepPartial<ConsignmentSettlement>) {
    super(input);
  }

  @EntityId()
  storeId: ID;

  @ManyToOne(() => Customer, { onDelete: "CASCADE" })
  store: Customer;

  @Column({ type: "date" })
  settlementDate: Date;

  @Column({ type: "varchar" })
  status: SettlementStatus;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  paidAt: Date | null;

  @Column({ type: "timestamp", nullable: true })
  closedAt: Date | null;
}
