import {
  api,
  Button,
  Card,
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  Input,
  useLocalFormat,
  ComboboxChipsInput,
  ComboboxValue,
  ComboboxChips,
  ComboboxChip,
  useComboboxAnchor,
} from "@vendure/dashboard";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { graphql } from "@/gql";

// ─── Queries ─────────────────────────────────────────────────────────────────

const LIST_FACETS = graphql(`
  query PosFacets {
    facets(options: { take: 50 }) {
      items {
        id
        name
        values {
          id
          name
        }
      }
    }
  }
`);

const LIST_VARIANTS = graphql(`
  query PosProductVariants(
    $search: String
    $facetValueIds: [String!]
    $skip: Int
    $take: Int
  ) {
    productVariants(
      options: {
        skip: $skip
        take: $take
        filter: {
          enabled: { eq: true }
          name: { contains: $search }
          facetValueId: { in: $facetValueIds }
        }
      }
    ) {
      totalItems
      items {
        id
        name
        sku
        currencyCode
        priceWithTax
        enabled
        product {
          id
          name
          featuredAsset {
            preview
          }
        }
        featuredAsset {
          preview
        }
      }
    }
  }
`);

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = {
  id: string;
  name: string;
  sku: string;
  currencyCode: string;
  priceWithTax: number;
  enabled: boolean;
  product: {
    id: string;
    name: string;
    featuredAsset: { preview: string } | null;
  };
  featuredAsset: { preview: string } | null;
};

type FacetValue = { id: string; name: string };
type Facet = { id: string; name: string; values: FacetValue[] };
type FacetOption = { id: string; name: string; facetName: string };

interface Props {
  cartQuantities: Record<string, number>;
  onAddItem: (variantId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductGrid({ cartQuantities, onAddItem }: Props) {
  const { formatCurrency } = useLocalFormat();
  const [search, setSearch] = useState("");
  const [facets, setFacets] = useState<Facet[]>([]);
  const [activeFacetValueIds, setActiveFacetValueIds] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchor = useComboboxAnchor();

  const facetOptions = useMemo<FacetOption[]>(
    () =>
      facets.flatMap((facet) =>
        facet.values.map((value) => ({
          id: value.id,
          name: value.name,
          facetName: facet.name,
        })),
      ),
    [facets],
  );

  const facetOptionsById = useMemo(
    () => new Map(facetOptions.map((option) => [option.id, option])),
    [facetOptions],
  );

  // Load facets once
  useEffect(() => {
    let active = true;
    void api.query(LIST_FACETS, {}).then((result) => {
      if (!active) return;
      setFacets(result?.facets?.items ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  // Load variants with debounce on search/filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let active = true;
    debounceRef.current = setTimeout(() => {
      setLoadingVariants(true);
      void api
        .query(LIST_VARIANTS, {
          search: search || undefined,
          facetValueIds:
            activeFacetValueIds.length > 0 ? activeFacetValueIds : undefined,
          skip: 0,
          take: 80,
        })
        .then((result) => {
          if (!active) return;
          setVariants(result?.productVariants?.items ?? []);
        })
        .finally(() => {
          if (active) setLoadingVariants(false);
        });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      active = false;
    };
  }, [search, activeFacetValueIds]);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border py-2 pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      {/* Facet filter combobox */}
      {facets.length > 0 && (
        <div className="flex flex-col gap-2">
          <Combobox<string, true>
            items={facetOptions.map((option) => option.id)}
            multiple
            value={activeFacetValueIds}
            onValueChange={(nextValues) => setActiveFacetValueIds(nextValues)}
            itemToStringValue={(itemId) => itemId}
            itemToStringLabel={(itemId) => {
              const option = facetOptionsById.get(itemId);
              return option ? `${option.facetName}: ${option.name}` : itemId;
            }}
          >
            <ComboboxChips ref={anchor} className="w-full">
              <ComboboxValue placeholder="Filter by facets…">
                {(values) => (
                  <>
                    {values.map((value: string) => {
                      const option = facetOptionsById.get(value);
                      return (
                        <ComboboxChip key={value}>
                          {option
                            ? `${option.facetName}: ${option.name}`
                            : value}
                        </ComboboxChip>
                      );
                    })}
                    <ComboboxChipsInput placeholder="Filter by facets" />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
              {/* <ComboboxInput
                placeholder="Filter by facet values..."
                className="w-full"
                showClear
              /> */}
              <ComboboxList>
                <ComboboxCollection>
                  {(itemId: string) => {
                    const option = facetOptionsById.get(itemId);
                    if (!option) return null;
                    return (
                      <ComboboxItem value={itemId} key={itemId}>
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate">{option.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.facetName}
                          </span>
                        </div>
                      </ComboboxItem>
                    );
                  }}
                </ComboboxCollection>
              </ComboboxList>
              <ComboboxEmpty>No facet values found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>

          {activeFacetValueIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground text-xs">
                {activeFacetValueIds.length} selected
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveFacetValueIds([])}
                className="text-muted-foreground hover:text-foreground rounded-full px-2 py-0.5 text-xs underline"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div
        className={[
          "grid flex-1 content-start gap-3 overflow-y-auto pb-4",
          "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
          loadingVariants ? "opacity-60" : "",
        ].join(" ")}
      >
        {variants.map((variant) => {
          const qty = cartQuantities[variant.id] ?? 0;
          const imageUrl =
            variant.featuredAsset?.preview ??
            variant.product.featuredAsset?.preview;
          return (
            <Button
              key={variant.id}
              type="button"
              variant="ghost"
              onClick={() => onAddItem(variant.id)}
              className="focus-visible:ring-ring group h-auto rounded-xl p-0 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <Card className="bg-card border-border group-hover:border-primary relative flex w-full flex-col gap-0 overflow-hidden rounded-xl border py-0 transition-all active:scale-95">
                {/* Qty badge */}
                {qty > 0 && (
                  <span className="bg-primary text-primary-foreground absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold">
                    {qty}
                  </span>
                )}

                {/* Image */}
                <div className="bg-muted aspect-square w-full overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={`${imageUrl}?w=240&h=240&mode=crop`}
                      alt={variant.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center text-3xl">
                      📦
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-0.5 p-2 text-left">
                  <span className="text-foreground line-clamp-2 text-xs font-medium leading-tight">
                    {variant.product.name}
                  </span>
                  {variant.name !== variant.product.name && (
                    <span className="text-muted-foreground line-clamp-1 text-[11px]">
                      {variant.name}
                    </span>
                  )}
                  <span className="text-primary mt-auto text-sm font-semibold">
                    {formatCurrency(variant.priceWithTax, variant.currencyCode)}
                  </span>
                </div>
              </Card>
            </Button>
          );
        })}

        {!loadingVariants && variants.length === 0 && (
          <div className="text-muted-foreground col-span-full py-12 text-center text-sm">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
