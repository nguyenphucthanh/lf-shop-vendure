import {
  SingleRelationInput,
  createRelationSelectorConfig,
  graphql,
  ResultOf,
  DashboardFormComponentProps,
} from "@vendure/dashboard";
import { useRef } from "react";

// Define the GraphQL query for product variants
const productVariantListQuery = graphql(`
  query GetProductVariantsForSelection($options: ProductVariantListOptions) {
    productVariants(options: $options) {
      items {
        id
        name
        sku
        priceWithTax
        product {
          id
          name
          featuredAsset {
            id
            preview
          }
        }
      }
      totalItems
    }
  }
`);

interface ProductVariantSearchSelectProps extends DashboardFormComponentProps {
  placeholder?: string;
}

export function ProductVariantSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = "Search product variants...",
}: ProductVariantSearchSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Create the configuration
  const variantConfig = createRelationSelectorConfig<
    ResultOf<typeof productVariantListQuery>["productVariants"]["items"][0]
  >({
    listQuery: productVariantListQuery as any,
    idKey: "id",
    labelKey: "name",
    placeholder,
    label: (variant) => (
      <div className="flex items-center justify-between py-1 w-full">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{variant.product.name}</div>
          <div className="text-sm text-muted-foreground truncate">
            {variant.name}
          </div>
          {variant.sku && (
            <div className="text-xs text-muted-foreground">
              SKU: {variant.sku}
            </div>
          )}
        </div>
        <div className="text-sm font-medium ml-2 whitespace-nowrap">
          {(variant.priceWithTax / 100).toFixed(2)}
        </div>
      </div>
    ),
    buildSearchFilter: (term: string) => ({
      or: [
        { name: { contains: term } },
        { sku: { contains: term } },
        { product: { name: { contains: term } } },
      ],
    }),
  });

  return (
    <SingleRelationInput
      value={value}
      onChange={onChange}
      config={variantConfig}
      disabled={disabled}
      onBlur={() => {}}
      name={"select-product-variant"}
      ref={(r) => (ref.current = r)}
    />
  );
}
