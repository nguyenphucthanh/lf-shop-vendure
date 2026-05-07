import { CurrencyCode } from "@vendure/common/lib/generated-types";
import { DeepPartial, ID } from "@vendure/common/lib/shared-types";
import {
  Channel,
  EntityId,
  Money,
  ProductVariant,
  VendureEntity,
} from "@vendure/core";
import { Column, Entity, Index, ManyToOne } from "typeorm";

@Entity()
@Index(
  "idx_product_variant_cost_variant_channel_currency",
  ["variantId", "channelId", "currencyCode"],
  {
    unique: true,
  },
)
export class ProductVariantCost extends VendureEntity {
  constructor(input?: DeepPartial<ProductVariantCost>) {
    super(input);
  }

  @Money()
  cost: number;

  @EntityId()
  variantId: ID;

  @ManyToOne(() => ProductVariant, { onDelete: "CASCADE" })
  variant: ProductVariant;

  @EntityId()
  channelId: ID;

  @ManyToOne(() => Channel, { onDelete: "CASCADE" })
  channel: Channel;

  @Column("varchar")
  currencyCode: CurrencyCode;
}
