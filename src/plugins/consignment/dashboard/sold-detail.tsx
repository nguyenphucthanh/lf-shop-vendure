import {
  AnyRoute,
  api,
  Button,
  Card,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  useLocalFormat,
} from "@vendure/dashboard";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

import {
  LineItemDraft,
  LineItemsEditor,
  getApiErrorMessage,
  SimplePage,
  isoDate,
  toDateTimeInput,
  useStore,
} from "./shared";

const GET_SOLD = graphql(`
  query ConsignmentSoldDetail($id: ID!) {
    consignmentSold(id: $id) {
      id
      storeId
      soldDate
      total
      items {
        id
        quotationId
        quantity
        consignmentPriceSnapshot
        currency
      }
    }
  }
`);

const CREATE_SOLD = graphql(`
  mutation CreateConsignmentSold($input: CreateConsignmentSoldInput!) {
    createConsignmentSold(input: $input) {
      id
    }
  }
`);

const UPDATE_SOLD = graphql(`
  mutation UpdateConsignmentSold($input: UpdateConsignmentSoldInput!) {
    updateConsignmentSold(input: $input) {
      id
    }
  }
`);

const DELETE_SOLD = graphql(`
  mutation DeleteConsignmentSold($id: ID!) {
    deleteConsignmentSold(id: $id)
  }
`);

export function SoldDetailPage({ route }: { route: AnyRoute }) {
  const { formatCurrency } = useLocalFormat();
  const navigate = route.useNavigate();
  const params = route.useParams();
  const isNew = params.id === "new";
  const search = route.useSearch();

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);

  const [soldDate, setSoldDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [initialDocumentQtyByQuotation, setInitialDocumentQtyByQuotation] =
    useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !params.id) {
      setItems([]);
      setInitialDocumentQtyByQuotation({});
      return;
    }
    void api.query(GET_SOLD, { id: params.id }).then((result) => {
      const sold = result?.consignmentSold;
      if (!sold) return;
      setStoreId(String(sold.storeId));
      setSoldDate(isoDate(sold.soldDate));
      setItems(
        (sold.items ?? []).map((item) => ({
          quotationId: String(item.quotationId),
          quantity: Number(item.quantity ?? 0),
          consignmentPriceSnapshot: Number(item.consignmentPriceSnapshot ?? 0),
          currency: item.currency ?? "USD",
        })),
      );
      const baseline = (sold.items ?? []).reduce<Record<string, number>>(
        (acc, item) => {
          const quotationId = String(item.quotationId);
          acc[quotationId] = (acc[quotationId] ?? 0) + Number(item.quantity ?? 0);
          return acc;
        },
        {},
      );
      setInitialDocumentQtyByQuotation(baseline);
    });
  }, [isNew, params.id]);

  async function save() {
    setSaving(true);
    try {
      const input = {
        storeId,
        soldDate: toDateTimeInput(soldDate),
        items: items.map((item) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot,
        })),
      };
      if (isNew) {
        const result = await api.mutate(CREATE_SOLD, { input });
        const id = result?.createConsignmentSold?.id;
        if (id) {
          navigate({ to: `/consignment/solds/${id}` });
        }
      } else {
        const { storeId: soldStoreId, ...updateInput } = input;
        await api.mutate(UPDATE_SOLD, {
          input: { id: params.id, ...updateInput },
        });
        navigate({
          to: "/consignment/solds",
          search: { storeId: soldStoreId },
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this sold record?")) return;
    try {
      await api.mutate(DELETE_SOLD, { id: params.id });
      navigate({ to: "/consignment/solds", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const subtotalPreview = items.reduce((sum, item) => {
    return sum + item.consignmentPriceSnapshot * item.quantity;
  }, 0);

  const currency = items[0]?.currency ?? "USD";
  const hasInvalidItems =
    items.length === 0 ||
    items.some((item) => !item.quotationId || Number(item.quantity) <= 0);

  return (
    <SimplePage
      title={isNew ? "New Sold" : "Edit Sold"}
      actions={
        <>
          {!isNew ? (
            <Button variant="ghost" onClick={remove}>
              Delete
            </Button>
          ) : null}
          <Button
            onClick={save}
            disabled={saving || !storeId || hasInvalidItems}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <Card className="space-y-4 p-4">
        <div className="lg:grid grid-cols-12 gap-4">
          <div className="space-y-2 col-span-12">
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
            </Field>
          </div>

          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Sold date</FieldLabel>
              <FieldContent>
                <Input
                  type="date"
                  value={soldDate}
                  onChange={(event) => setSoldDate(event.target.value)}
                />
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-2 col-span-12">
            <Field>
              <FieldLabel>Subtotal preview</FieldLabel>
              <FieldContent>
                {formatCurrency(subtotalPreview, currency)}
              </FieldContent>
            </Field>
          </div>
        </div>
      </Card>

      {storeId ? (
        <LineItemsEditor
          storeId={storeId}
          value={items}
          onChange={setItems}
          calculateMaxQty="in-sold"
          initialDocumentQtyByQuotation={initialDocumentQtyByQuotation}
        />
      ) : null}
    </SimplePage>
  );
}
