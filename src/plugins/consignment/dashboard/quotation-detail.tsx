import {
  AnyRoute,
  api,
  Button,
  Card,
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  Input,
  Textarea,
  useLocalFormat,
} from "@vendure/dashboard";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import { graphql } from "@/gql";
import { ProductVariantSearchSelect } from "./shared-ui";

import {
  EmptyState,
  getApiErrorMessage,
  SimplePage,
  useProductVariant,
  useStore,
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
      currency
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
  const { formatCurrency } = useLocalFormat();
  const params = route.useParams();
  const navigate = route.useNavigate();
  const search = route.useSearch();
  console.log("🚀 ~ QuotationDetailPage ~ search:", search);
  const isNew = params.id === "new";

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);
  const [productVariantId, setProductVariantId] = useState("");
  const [consignmentPrice, setConsignmentPrice] = useState("0");
  const [currency, setCurrency] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedVariant = useProductVariant(productVariantId);

  useEffect(() => {
    if (isNew || !params.id) return;
    void api.query(GET_QUOTATION, { id: params.id }).then((result) => {
      const quotation = result?.consignmentQuotation;
      if (!quotation) {
        return;
      }
      setStoreId(quotation.storeId);
      setProductVariantId(quotation.productVariantId);
      setConsignmentPrice(String(quotation.consignmentPrice / 100));
      setCurrency(quotation.currency);
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
    setCurrency(selectedVariant.currencyCode);
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
        const id = result?.createConsignmentQuotation?.id;
        if (id) {
          toast.success("Quotation created successfully");
          navigate({ to: `/consignment/quotations/${id}` });
        }
      } else {
        await api.mutate(UPDATE_QUOTATION, {
          input: { id: params.id, consignmentPrice: price, note: note || null },
        });
        toast.success("Quotation updated successfully");
        navigate({
          to: "/consignment/quotations",
          search: { storeId },
        });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this quotation?")) return;
    try {
      await api.mutate(DELETE_QUOTATION, { id: params.id });
      toast.success("Quotation deleted successfully");
      navigate({ to: "/consignment/quotations", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
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
          <Field>
            <FieldLabel>Consignment Store</FieldLabel>
            <FieldContent>
              <Input
                value={
                  selectedStore
                    ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ""}`
                    : storeId
                      ? `Store #${storeId}`
                      : "Not selected"
                }
                readOnly
              />
            </FieldContent>
            <FieldDescription>
              Default discount:{" "}
              {selectedStore?.defaultDiscountPercent
                ? `${selectedStore.defaultDiscountPercent}%`
                : "None"}
            </FieldDescription>
          </Field>
        </div>
        <div className="space-y-2">
          <Field>
            <FieldLabel>Product Variant</FieldLabel>
            <FieldContent>
              <ProductVariantSearchSelect
                value={productVariantId}
                onChange={setProductVariantId}
                placeholder="Search product variant..."
                disabled={!isNew}
              />
            </FieldContent>
          </Field>
        </div>
        <div className="space-y-2">
          <Field>
            <FieldLabel>Consignment Price</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={consignmentPrice}
                onChange={(event) => setConsignmentPrice(event.target.value)}
              />
            </FieldContent>
            <FieldDescription>
              Stored money value:{" "}
              {formatCurrency(
                Math.round(Number(consignmentPrice || 0) * 100),
                currency || "USD",
              )}
            </FieldDescription>
          </Field>
        </div>
        <div className="space-y-2">
          <Field>
            <FieldLabel>Note</FieldLabel>
            <FieldContent>
              <Textarea
                className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </FieldContent>
          </Field>
        </div>
      </Card>
      {!storeId ? <EmptyState title="Select a store first" /> : null}
    </SimplePage>
  );
}
