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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FullWidthPageBlock,
  Input,
  Page,
  PageActionBar,
  PageLayout,
  PageTitle,
  useLocalFormat,
  Link,
} from "@vendure/dashboard";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { graphql } from "@/gql";
import { CustomerSearchSelect } from "./shared-ui";

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

export const GET_PRODUCT_VARIANT = graphql(`
  query ConsignmentProductVariant($id: ID!) {
    productVariant(id: $id) {
      id
      name
      sku
      priceWithTax
      currencyCode
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
      currency
      note
    }
  }
`);

export const GET_QUANTITY_AGGREGATES = graphql(`
  query ConsignmentQuantityAggregates($storeId: ID!) {
    consignmentReport(storeId: $storeId) {
      quotationId
      intakeQty
      soldQty
      returnedQty
    }
  }
`);

export const QUOTATION_BY_ID = graphql(`
  query ConsignmentQuotationById($id: ID!) {
    consignmentQuotation(id: $id) {
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
      currency
      note
    }
  }
`);

export const INTAKE_BY_ID = graphql(`
  query ConsignmentIntakeById($id: ID!) {
    consignmentIntake(id: $id) {
      id
      createdAt
      storeId
      intakeDate
      paymentPolicy
      deliveryMethod
      deliveryTrackingCode
      deliveryCost
      total
    }
  }
`);

export const PAYMENT_BY_ID = graphql(`
  query ConsignmentPaymentById($id: ID!) {
    consignmentPayment(id: $id) {
      id
      createdAt
      storeId
      paymentDate
      paymentMethod
      subtotal
      discount
      total
      paymentStatus
    }
  }
`);

export const SOLD_BY_ID = graphql(`
  query ConsignmentSoldById($id: ID!) {
    consignmentSold(id: $id) {
      id
      createdAt
      storeId
      soldDate
      total
    }
  }
`);

export const RETURN_BY_ID = graphql(`
  query ConsignmentReturnById($id: ID!) {
    consignmentReturn(id: $id) {
      id
      createdAt
      storeId
      reason
      total
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
  currencyCode: string;
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
  currency: string;
  note?: string | null;
};

export type LineItemDraft = {
  quotationId: string;
  quantity: number;
  consignmentPriceSnapshot: number;
  currency: string;
};

export function isoDate(value?: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function toDateTimeInput(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

export function getApiErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const err = error as {
      graphQLErrors?: Array<{ message?: string }>;
      response?: { errors?: Array<{ message?: string }> };
      message?: string;
    };
    const graphQlMessage =
      err.graphQLErrors?.[0]?.message ?? err.response?.errors?.[0]?.message;
    if (graphQlMessage) return graphQlMessage;
    if (err.message) return err.message;
  }
  return "Unknown error";
}

export function useStore(storeId?: string | null) {
  const [store, setStore] = useState<StoreOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

export function getTranslatedName(
  translations: Array<{ languageCode: string; name: string }> | undefined,
  preferredLanguageCode?: string,
): string {
  if (!translations || translations.length === 0) return "";
  if (preferredLanguageCode) {
    const match = translations.find((t) => t.languageCode === preferredLanguageCode);
    if (match) return match.name;
  }
  const contextDefault = translations.find((t) => t.languageCode === "");
  if (contextDefault) return contextDefault.name;
  return translations[0]?.name ?? "";
}

export function useProductVariant(id: string) {
  const [variant, setVariant] = useState<ProductVariantOption | null>(null);

  useEffect(() => {
    let active = true;
    void api.query(GET_PRODUCT_VARIANT, { id }).then((result) => {
      if (!active) return;
      setVariant(
        result.productVariant
          ? {
              id: result.productVariant.id,
              name: result.productVariant.name,
              sku: result.productVariant.sku,
              priceWithTax: result.productVariant.priceWithTax,
              currencyCode: result.productVariant.currencyCode,
            }
          : null,
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return variant;
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

export function SimplePage(props: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Page title={props.title}>
      <PageTitle>{props.title}</PageTitle>
      <PageActionBar>{props.actions}</PageActionBar>
      <PageLayout>
        <FullWidthPageBlock blockId="main" className="space-y-4">
          {props.children}
        </FullWidthPageBlock>
      </PageLayout>
    </Page>
  );
}

export function StoreFilterCard(props: {
  storeId: string;
  onStoreChange: (value: string) => void;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <Field>
        <FieldLabel>Consignment Store</FieldLabel>
        <FieldContent>
          <CustomerSearchSelect
            value={props.storeId}
            onChange={props.onStoreChange}
            filterOptions={{ isConsignment: true }}
            placeholder="Search consignment store..."
            disabled={props.loading}
          />
        </FieldContent>
      </Field>
    </Card>
  );
}

export function EmptyState(props: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{props.title}</EmptyTitle>
        {props.description ? (
          <EmptyDescription>{props.description}</EmptyDescription>
        ) : null}
        {props.action ? <EmptyContent>{props.action}</EmptyContent> : null}
      </EmptyHeader>
    </Empty>
  );
}

export function LineItemsEditor(props: {
  storeId: string;
  value: LineItemDraft[];
  onChange: (items: LineItemDraft[]) => void;
  calculateMaxQty?: false | "in-sold" | "in-return";
  initialDocumentQtyByQuotation?: Record<string, number>;
}) {
  const { formatCurrency } = useLocalFormat();
  const { quotations, loading } = useQuotations(props.storeId);
  const [quantityByQuotationId, setQuantityByQuotationId] = useState<
    Record<string, { intakeQty: number; soldQty: number; returnedQty: number }>
  >({});
  const [quantityAggregatesLoading, setQuantityAggregatesLoading] =
    useState(false);
  const quotationMap = useMemo(
    () => Object.fromEntries(quotations.map((q) => [q.id, q])),
    [quotations],
  );

  useEffect(() => {
    setQuantityByQuotationId({});
    setQuantityAggregatesLoading(false);
  }, [props.storeId]);

  async function loadQuantityAggregates() {
    if (!props.storeId || props.calculateMaxQty === false) return;
    if (quantityAggregatesLoading) return;
    if (Object.keys(quantityByQuotationId).length > 0) return;
    setQuantityAggregatesLoading(true);
    try {
      const result = await api.query(GET_QUANTITY_AGGREGATES, {
        storeId: props.storeId,
      });
      const next: Record<
        string,
        { intakeQty: number; soldQty: number; returnedQty: number }
      > = {};
      for (const row of result?.consignmentReport ?? []) {
        next[row.quotationId] = {
          intakeQty: Number(row.intakeQty ?? 0),
          soldQty: Number(row.soldQty ?? 0),
          returnedQty: Number(row.returnedQty ?? 0),
        };
      }
      setQuantityByQuotationId(next);
    } finally {
      setQuantityAggregatesLoading(false);
    }
  }

  useEffect(() => {
    if (props.calculateMaxQty === false || !props.storeId) return;
    const hasSelectedQuotation = props.value.some((line) => !!line.quotationId);
    if (!hasSelectedQuotation) return;
    void loadQuantityAggregates();
  }, [props.calculateMaxQty, props.storeId, props.value]);

  function getMaxQty(line: LineItemDraft) {
    if (props.calculateMaxQty === false || !line.quotationId) return undefined;
    const aggregate = quantityByQuotationId[line.quotationId];
    if (!aggregate) return undefined;
    const initialDocumentQty =
      props.initialDocumentQtyByQuotation?.[line.quotationId] ?? 0;
    return Math.max(
      0,
      aggregate.intakeQty -
        aggregate.soldQty -
        aggregate.returnedQty +
        initialDocumentQty,
    );
  }

  function update(index: number, patch: Partial<LineItemDraft>) {
    const next = [...props.value];
    next[index] = { ...next[index], ...patch };
    props.onChange(next);
  }

  function addLine() {
    const firstQuotation = quotations[0];
    props.onChange([
      ...props.value,
      {
        quotationId: firstQuotation?.id ?? "",
        quantity: 1,
        consignmentPriceSnapshot: firstQuotation?.consignmentPrice ?? 0,
        currency: firstQuotation?.currency || "USD",
      },
    ]);
  }

  function removeLine(index: number) {
    props.onChange(props.value.filter((_, i) => i !== index));
  }

  const total = props.value.reduce((sum, line) => {
    return (
      sum + (line.consignmentPriceSnapshot ?? 0) * (Number(line.quantity) || 0)
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
            (line.consignmentPriceSnapshot ?? 0) * (Number(line.quantity) || 0);
          const maxQty = getMaxQty(line);
          return (
            <div
              key={index}
              className="@3xl:grid grid-cols-12 gap-3 rounded-md border p-3 space-y-3 @3xl:space-y-0"
            >
              <div className="col-span-5 space-y-1">
                <Field>
                  <FieldLabel>Quotation</FieldLabel>
                  <FieldContent>
                    <Combobox
                      items={quotations}
                      value={quotation ?? null}
                      disabled={loading}
                      onValueChange={(nextValue) => {
                        const selectedQuotation =
                          (nextValue as QuotationOption | null) ?? null;
                        if (selectedQuotation?.id) {
                          void loadQuantityAggregates();
                        }
                        update(index, {
                          quotationId: selectedQuotation?.id ?? "",
                          consignmentPriceSnapshot:
                            selectedQuotation?.consignmentPrice ?? 0,
                          currency: selectedQuotation?.currency ?? "USD",
                        });
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
                                    {option.productVariantFeaturedAsset
                                      ?.preview ? (
                                      <img
                                        src={
                                          option.productVariantFeaturedAsset
                                            .preview
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
                                      {formatCurrency(
                                        option.consignmentPrice,
                                        option.currency || "USD",
                                      )}
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
                  </FieldContent>
                </Field>
              </div>

              <div className="col-span-2 space-y-1">
                <Field>
                  <FieldLabel>Price</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={String((line.consignmentPriceSnapshot ?? 0) / 100)}
                      onChange={(event) =>
                        update(index, {
                          consignmentPriceSnapshot: Math.round(
                            Number(event.target.value || 0) * 100,
                          ),
                        })
                      }
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="col-span-2 space-y-1">
                <Field>
                  <FieldLabel>Quantity</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={1}
                      value={String(line.quantity)}
                      onChange={(event) =>
                        update(index, {
                          quantity: Number(event.target.value || 0),
                        })
                      }
                    />
                  </FieldContent>
                  {maxQty !== undefined ? (
                    <FieldDescription>
                      Available to allocate: {maxQty}
                      {quantityAggregatesLoading ? " (loading...)" : ""}
                    </FieldDescription>
                  ) : null}
                </Field>
              </div>
              <div className="col-span-2 space-y-1 flex flex-col items-end">
                <Field>
                  <FieldLabel>Subtotal</FieldLabel>
                  <FieldContent>
                    {formatCurrency(subtotal, line.currency || "USD")}
                  </FieldContent>
                </Field>
              </div>
              <div className="col-span-1 text-right">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeLine(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        <div className="flex justify-end text-sm font-medium">
          Items subtotal:{" "}
          {formatCurrency(total, quotations?.[0]?.currency || "USD")}
        </div>
      </div>
    </Card>
  );
}
