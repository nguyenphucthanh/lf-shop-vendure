import {
  SingleRelationInput,
  createRelationSelectorConfig,
  graphql,
  ResultOf,
  DashboardFormComponentProps,
  useLocalFormat,
} from "@vendure/dashboard";
import { useRef } from "react";

// Define the GraphQL query for product variants
const PRODUCT_VARIANTS_LIST = graphql(`
  query GetProductVariantsForSelection($options: ProductVariantListOptions) {
    productVariants(options: $options) {
      items {
        id
        name
        sku
        priceWithTax
        currencyCode
        featuredAsset {
          id
          preview
          source
          width
          height
        }
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
}: Omit<ProductVariantSearchSelectProps, "onBlur" | "ref" | "name">) {
  const { formatCurrency } = useLocalFormat();
  const ref = useRef<HTMLDivElement>(null);
  // Create the configuration
  const variantConfig = createRelationSelectorConfig<
    ResultOf<typeof PRODUCT_VARIANTS_LIST>["productVariants"]["items"][0]
  >({
    listQuery: PRODUCT_VARIANTS_LIST as any,
    idKey: "id",
    labelKey: "name",
    placeholder,
    label: (variant) => (
      <div className="flex items-start justify-between py-1 w-full gap-2">
        {variant.featuredAsset ? (
          <img
            src={variant.featuredAsset.preview}
            alt={variant.name}
            className="w-16 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-muted rounded" />
        )}
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
          <div className="text-sm font-medium ml-2 whitespace-nowrap text-right">
            {formatCurrency(variant.priceWithTax, variant.currencyCode)}
          </div>
        </div>
      </div>
    ),
    buildSearchFilter: (term: string) => ({
      _or: [{ name: { contains: term } }, { sku: { contains: term } }],
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
