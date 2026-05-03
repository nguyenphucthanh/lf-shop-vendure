import {
  api,
  Button,
  Card,
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vendure/dashboard";
import { useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { CustomerSearchSelect } from "./shared-ui";

export const GET_STORES = graphql(`
  query ConsignmentStores {
    customers(options: { take: 100, sort: { createdAt: DESC } }) {
      items {
        id
        firstName
        lastName
        emailAddress
        customFields {
          externalId
          defaultDiscountPercent
          consignmentStore
        }
      }
    }
  }
`);

export const GET_STORE = graphql(`
  query ConsignmentStore($id: String!) {
    customers(options: { take: 1, filter: { id: { eq: $id } } }) {
      items {
        id
        firstName
        lastName
        emailAddress
        customFields {
          externalId
          defaultDiscountPercent
          consignmentStore
        }
      }
    }
  }
`);

export const GET_PRODUCT_VARIANTS = graphql(`
  query ConsignmentProductVariants {
    productVariants(options: { take: 100, sort: { createdAt: DESC } }) {
      items {
        id
        name
        sku
        priceWithTax
      }
    }
  }
`);

export const GET_QUOTATIONS = graphql(`
  query ConsignmentQuotations($storeId: ID!) {
    consignmentQuotations(storeId: $storeId) {
      id
      createdAt
      storeId
      productVariantId
      productVariantName
      productVariantSku
      productVariantFeaturedAsset {
        id
        preview
      }
      consignmentPrice
      note
    }
  }
`);

export type StoreOption = {
  id: string;
  name: string;
  emailAddress?: string | null;
  externalId?: string | null;
  defaultDiscountPercent?: number | null;
};

export type ProductVariantOption = {
  id: string;
  name: string;
  sku: string;
  priceWithTax: number;
};

export type QuotationOption = {
  id: string;
  storeId: string;
  productVariantId: string;
  productVariantName: string;
  productVariantSku: string;
  productVariantFeaturedAsset?: {
    id: string;
    preview?: string | null;
  } | null;
  consignmentPrice: number;
  note?: string | null;
};

export type LineItemDraft = {
  quotationId: string;
  quantity: number;
};

export function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((value ?? 0) / 100);
}

export function isoDate(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function toDateTimeInput(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

export function useStores() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api
      .query(GET_STORES, {})
      .then((result) => {
        if (!active) return;
        const items = result?.customers?.items ?? [];
        setStores(
          items.map((item: any) => ({
            id: item.id,
            name:
              [item.firstName, item.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || item.emailAddress,
            emailAddress: item.emailAddress,
            externalId: item.customFields?.externalId ?? null,
            defaultDiscountPercent:
              item.customFields?.defaultDiscountPercent ?? null,
          })),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { stores, loading };
}

export function useStore(storeId?: string | null) {
  const [store, setStore] = useState<StoreOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🚀 ~ useStore ~ storeId:", storeId);
    if (!storeId) {
      setStore(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void api
      .query(GET_STORE, { id: storeId })
      .then((result) => {
        if (!active) return;
        const item = result?.customers?.items?.[0];
        if (!item) {
          setStore(null);
          return;
        }
        setStore({
          id: item.id,
          name:
            [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
            item.emailAddress,
          emailAddress: item.emailAddress,
          externalId: item.customFields?.externalId ?? null,
          defaultDiscountPercent:
            item.customFields?.defaultDiscountPercent ?? null,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId]);

  return { store, loading };
}

export function useProductVariants() {
  const [variants, setVariants] = useState<ProductVariantOption[]>([]);

  useEffect(() => {
    let active = true;
    void api.query(GET_PRODUCT_VARIANTS, {}).then((result) => {
      if (!active) return;
      setVariants(
        (result?.productVariants?.items ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          priceWithTax: item.priceWithTax,
        })),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return variants;
}

export function useQuotations(storeId?: string) {
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setQuotations([]);
      return;
    }
    let active = true;
    setLoading(true);
    void api
      .query(GET_QUOTATIONS, { storeId })
      .then((result) => {
        if (!active) return;
        setQuotations(
          (result?.consignmentQuotations ?? []) as QuotationOption[],
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId]);

  return { quotations, loading };
}

export function StoreSelect(props: {
  value: string;
  onChange: (value: string) => void;
  stores: StoreOption[];
  disabled?: boolean;
}) {
  return (
    <select
      className="w-full rounded-md border px-3 py-2 text-sm"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      disabled={props.disabled}
    >
      <option value="">Select a store</option>
      {props.stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
          {store.externalId ? ` (${store.externalId})` : ""}
        </option>
      ))}
    </select>
  );
}

export function SimplePage(props: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{props.title}</h1>
        <div className="flex items-center gap-2">{props.actions}</div>
      </div>
      {props.children}
    </div>
  );
}

export function StoreFilterCard(props: {
  storeId: string;
  onStoreChange: (value: string) => void;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Consignment Store</label>
        <CustomerSearchSelect
          value={props.storeId}
          onChange={props.onStoreChange}
          filterOptions={{ isConsignment: true }}
          placeholder="Search consignment store..."
          disabled={props.loading}
        />
      </div>
    </Card>
  );
}

export function EmptyState(props: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">{props.title}</h2>
        {props.description ? (
          <p className="text-sm text-muted-foreground">{props.description}</p>
        ) : null}
        {props.action ? <div className="pt-2">{props.action}</div> : null}
      </div>
    </Card>
  );
}

export function LineItemsEditor(props: {
  storeId: string;
  value: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
}) {
  const { quotations, loading } = useQuotations(props.storeId);
  const quotationMap = useMemo(
    () => Object.fromEntries(quotations.map((q) => [q.id, q])),
    [quotations],
  );

  function update(index: number, patch: Partial<LineItemDraft>) {
    const next = [...props.value];
    next[index] = { ...next[index], ...patch };
    props.onChange(next);
  }

  function addLine() {
    props.onChange([
      ...props.value,
      { quotationId: quotations[0]?.id ?? "", quantity: 1 },
    ]);
  }

  function removeLine(index: number) {
    props.onChange(props.value.filter((_, i) => i !== index));
  }

  const total = props.value.reduce((sum, line) => {
    const quotation = quotationMap[line.quotationId];
    return (
      sum + (quotation?.consignmentPrice ?? 0) * (Number(line.quantity) || 0)
    );
  }, 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Items</h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addLine}
          disabled={!props.storeId || loading}
        >
          Add item
        </Button>
      </div>
      <div className="space-y-3 @container">
        {props.value.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add at least one quotation item.
          </p>
        ) : null}
        {props.value.map((line, index) => {
          const quotation = quotationMap[line.quotationId];
          const subtotal =
            (quotation?.consignmentPrice ?? 0) * (Number(line.quantity) || 0);
          return (
            <div
              key={index}
              className="@3xl:grid grid-cols-12 gap-3 rounded-md border p-3 space-y-3 @3xl:space-y-0"
            >
              <div className="col-span-7 space-y-1">
                <label className="text-sm font-medium">Quotation</label>
                <Combobox
                  items={quotations}
                  value={quotation ?? null}
                  disabled={loading}
                  onValueChange={(nextValue) => {
                    const selectedQuotation =
                      (nextValue as QuotationOption | null) ?? null;
                    update(index, { quotationId: selectedQuotation?.id ?? "" });
                  }}
                  itemToStringValue={(item) => item.id}
                >
                  <ComboboxTrigger
                    className={
                      "w-full border p-2 flex items-center gap-2 rounded-sm"
                    }
                  >
                    <ComboboxValue placeholder="Select quotation">
                      {(quotation) => {
                        return (
                          <div className="flex grow items-start gap-3 justify-start text-left">
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded border bg-muted">
                              {quotation?.productVariantFeaturedAsset
                                ?.preview ? (
                                <img
                                  src={
                                    quotation.productVariantFeaturedAsset
                                      .preview
                                  }
                                  alt={quotation.productVariantName}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1 truncate text-sm flex divide-x space-x-2">
                              <div className="font-semibold pr-2">
                                {quotation?.productVariantName}
                              </div>
                              <div className="text-gray-700 pr-2">
                                SKU: {quotation?.productVariantSku}
                              </div>
                              <div className="shrink-0 text-sm font-bold pr-2">
                                {formatMoney(quotation?.consignmentPrice)}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </ComboboxValue>
                  </ComboboxTrigger>
                  <ComboboxContent>
                    <ComboboxInput
                      placeholder="Select quotation"
                      showClear
                      showTrigger={false}
                    />
                    <ComboboxList>
                      <ComboboxCollection>
                        {(option: QuotationOption) => (
                          <ComboboxItem value={option} key={option.id}>
                            <div className="flex w-full items-center gap-3">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-muted">
                                {option.productVariantFeaturedAsset?.preview ? (
                                  <img
                                    src={
                                      option.productVariantFeaturedAsset.preview
                                    }
                                    alt={option.productVariantName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1 truncate text-sm">
                                <div className="font-semibold">
                                  {option.productVariantName}
                                </div>
                                <div className="text-gray-700">
                                  SKU: {option.productVariantSku}
                                </div>
                                <div className="shrink-0 text-sm font-bold">
                                  {formatMoney(option.consignmentPrice)}
                                </div>
                              </div>
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                    <ComboboxEmpty>No quotations found.</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
                {quotation ? (
                  <p className="text-xs text-muted-foreground">
                    Consignment: {formatMoney(quotation.consignmentPrice)}
                  </p>
                ) : null}
              </div>
              <div className="col-span-3 space-y-1">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={String(line.quantity)}
                  onChange={(event) =>
                    update(index, { quantity: Number(event.target.value || 0) })
                  }
                />
              </div>
              <div className="col-span-2 flex flex-col justify-between items-end">
                <div className="text-sm font-medium">
                  {formatMoney(subtotal)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(index)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
        <div className="flex justify-end text-sm font-medium">
          Items subtotal: {formatMoney(total)}
        </div>
      </div>
    </Card>
  );
}

export function KeyValueTable(props: {
  rows: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell>{row.label}</TableCell>
            <TableCell>{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
