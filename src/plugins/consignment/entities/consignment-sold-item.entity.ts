import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import { EntityId, Money, VendureEntity } from "@vendure/core";
import { Column, Entity, ManyToOne } from "typeorm";

import { ConsignmentQuotation } from "./consignment-quotation.entity";
import { ConsignmentSold } from "./consignment-sold.entity";

@Entity()
export class ConsignmentSoldItem extends VendureEntity {
  constructor(input?: DeepPartial<ConsignmentSoldItem>) {
    super(input);
  }

  @EntityId()
  soldId: ID;

  @ManyToOne(() => ConsignmentSold, (sold) => sold.items, {
    onDelete: "CASCADE",
  })
  sold: ConsignmentSold;

  @EntityId()
  quotationId: ID;

  @ManyToOne(() => ConsignmentQuotation, { onDelete: "RESTRICT" })
  quotation: ConsignmentQuotation;

  @Column({ type: "varchar", default: "" })
  currency: string;

  @Money()
  productPriceSnapshot: number;

  @Money()
  consignmentPriceSnapshot: number;

  @Column({ type: "int" })
  quantity: number;

  @Money()
  subtotal: number;
}
