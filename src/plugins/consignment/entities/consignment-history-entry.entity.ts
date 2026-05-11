import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import { EntityId, VendureEntity } from "@vendure/core";
import { Column, Entity, Index } from "typeorm";

export const consignmentHistoryObjectTypes = [
  "QUOTATION",
  "INTAKE",
  "RETURN",
  "SOLD",
  "PAYMENT",
] as const;

export type ConsignmentHistoryObjectType =
  (typeof consignmentHistoryObjectTypes)[number];

export const consignmentHistoryEntryTypes = [
  "CREATED",
  "UPDATED",
  "DELETED",
  "NOTE_ADDED",
] as const;

export type ConsignmentHistoryEntryType =
  (typeof consignmentHistoryEntryTypes)[number];

export type ConsignmentHistoryValue =
  | string
  | number
  | boolean
  | null
  | ConsignmentHistoryValue[]
  | ConsignmentHistoryData;

export interface ConsignmentHistoryData {
  [key: string]: ConsignmentHistoryValue;
}

export interface ConsignmentHistoryChange {
  field: string;
  before: ConsignmentHistoryValue;
  after: ConsignmentHistoryValue;
}

@Entity()
@Index("idx_consignment_history_object", [
  "objectType",
  "objectId",
  "createdAt",
])
@Index("idx_consignment_history_store", ["storeId", "createdAt"])
export class ConsignmentHistoryEntry extends VendureEntity {
  constructor(input?: DeepPartial<ConsignmentHistoryEntry>) {
    super(input);
  }

  @EntityId()
  storeId: ID;

  @Column({ type: "varchar", length: 20 })
  objectType: ConsignmentHistoryObjectType;

  @EntityId()
  objectId: ID;

  @Column({ type: "varchar", length: 20 })
  type: ConsignmentHistoryEntryType;

  @EntityId({ nullable: true })
  actorUserId: ID | null;

  @Column({ nullable: true, type: "varchar" })
  actorIdentifier: string | null;

  @Column("simple-json", { nullable: true })
  changes: ConsignmentHistoryChange[] | null;

  @Column({ nullable: true, type: "text" })
  note: string | null;

  @Column("simple-json", { nullable: true })
  data: ConsignmentHistoryData | null;
}
