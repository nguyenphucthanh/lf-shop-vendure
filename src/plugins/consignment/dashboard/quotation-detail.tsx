import { AnyRoute, api, Button, Card, Input } from "@vendure/dashboard";
import { useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { ProductVariantSearchSelect } from "./shared-ui";

import {
  EmptyState,
  formatMoney,
  SimplePage,
  useProductVariants,
  useStores,
} from "./shared";

const GET_QUOTATION = graphql(`
  query ConsignmentQuotationDetail($id: ID!) {
    consignmentQuotation(id: $id) {
      id
      storeId
      productVariantId
      productVariantName
      productVariantSku
      consignmentPrice
      note
    }
  }
`);

const CREATE_QUOTATION = graphql(`
  mutation CreateConsignmentQuotation(
    $input: CreateConsignmentQuotationInput!
  ) {
    createConsignmentQuotation(input: $input) {
      id
    }
  }
`);

const UPDATE_QUOTATION = graphql(`
  mutation UpdateConsignmentQuotation(
    $input: UpdateConsignmentQuotationInput!
  ) {
    updateConsignmentQuotation(input: $input) {
      id
    }
  }
`);

const DELETE_QUOTATION = graphql(`
  mutation DeleteConsignmentQuotation($id: ID!) {
    deleteConsignmentQuotation(id: $id)
  }
`);

export function QuotationDetailPage({ route }: { route: AnyRoute }) {
  const params = route.useParams();
  const navigate = route.useNavigate();
  const search = route.useSearch();
  const isNew = params.id === "new";
  const { stores } = useStores();
  const variants = useProductVariants();

  const [storeId, setStoreId] = useState(search?.storeId ?? "");
  const [productVariantId, setProductVariantId] = useState("");
  const [consignmentPrice, setConsignmentPrice] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === storeId),
    [stores, storeId],
  );
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === productVariantId),
    [variants, productVariantId],
  );

  useEffect(() => {
    if (isNew || !params.id) return;
    void api.query(GET_QUOTATION, { id: params.id }).then((result) => {
      const quotation = (result as any)?.consignmentQuotation;
      if (!quotation) return;
      setStoreId(quotation.storeId);
      setProductVariantId(quotation.productVariantId);
      setConsignmentPrice(String(quotation.consignmentPrice / 100));
      setNote(quotation.note ?? "");
    });
  }, [isNew, params.id]);

  useEffect(() => {
    if (!isNew || !selectedStore || !selectedVariant) return;
    const defaultDiscount = Number(selectedStore.defaultDiscountPercent ?? 0);
    const defaultPrice = Math.round(
      (selectedVariant.priceWithTax * (100 - defaultDiscount)) / 100,
    );
    setConsignmentPrice(String(defaultPrice / 100));
  }, [isNew, selectedStore, selectedVariant]);

  async function save() {
    setSaving(true);
    try {
      const price = Math.round(Number(consignmentPrice || 0) * 100);
      if (isNew) {
        const result = await api.mutate(CREATE_QUOTATION, {
          input: {
            storeId,
            productVariantId,
            consignmentPrice: price,
            note: note || null,
          },
        });
        const id = (result as any)?.createConsignmentQuotation?.id;
        if (id) {
          navigate({ to: `/consignment/quotations/${id}` });
        }
      } else {
        await api.mutate(UPDATE_QUOTATION, {
          input: { id: params.id, consignmentPrice: price, note: note || null },
        });
        navigate({ to: "/consignment/quotations" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this quotation?")) return;
    await api.mutate(DELETE_QUOTATION, { id: params.id });
    navigate({ to: "/consignment/quotations" });
  }

  return (
    <SimplePage
      title={isNew ? "New Consignment Quotation" : "Edit Consignment Quotation"}
      actions={
        <>
          {!isNew ? (
            <Button variant="ghost" onClick={remove}>
              Delete
            </Button>
          ) : null}
          <Button
            onClick={save}
            disabled={saving || !storeId || !productVariantId}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Consignment Store</label>
          <div className="rounded-md border px-3 py-2 text-sm">
            {selectedStore
              ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ""}`
              : storeId
                ? `Store #${storeId}`
                : "Not selected"}
          </div>
          <div>
            Default discount:{" "}
            {selectedStore?.defaultDiscountPercent
              ? `${selectedStore.defaultDiscountPercent}%`
              : "None"}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Product Variant</label>
          <ProductVariantSearchSelect
            value={productVariantId}
            onChange={setProductVariantId}
            placeholder="Search product variant..."
            disabled={!isNew}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Consignment Price</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={consignmentPrice}
            onChange={(event) => setConsignmentPrice(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Stored money value:{" "}
            {formatMoney(Math.round(Number(consignmentPrice || 0) * 100))}
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Note</label>
          <textarea
            className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </Card>
      {!storeId ? <EmptyState title="Select a store first" /> : null}
    </SimplePage>
  );
}
