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
import { useEffect, useMemo, useState } from "react";

import { Printer } from "lucide-react";

import { graphql } from "@/gql";

import {
  LineItemDraft,
  LineItemsEditor,
  getApiErrorMessage,
  SimplePage,
  isoDate,
  toDateTimeInput,
  useQuotations,
  useStore,
  openPrintWindow,
  formatMinorCurrency,
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

const GET_LINKED_PAYMENT = graphql(`
  query ConsignmentLinkedPaymentBySold($storeId: ID!) {
    consignmentPayments(storeId: $storeId) {
      id
      soldId
      paymentDate
      paymentPolicy
      paymentMethod
      paymentStatus
      subtotal
      discount
      total
    }
  }
`);

const CREATE_PAYMENT = graphql(`
  mutation CreateConsignmentPaymentFromSold(
    $input: CreateConsignmentPaymentInput!
  ) {
    createConsignmentPayment(input: $input) {
      id
    }
  }
`);

type LinkedPayment = {
  id: string;
  soldId?: string | null;
  paymentDate: string;
  paymentPolicy?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  total: number;
};

export function SoldDetailPage({ route }: { route: AnyRoute }) {
  const { formatCurrency } = useLocalFormat();
  const navigate = route.useNavigate();
  const params = route.useParams();
  const isNew = params.id === "new";
  const search = route.useSearch();

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);
  const { quotations, loading: quotationsLoading } = useQuotations(storeId);
  const quotationMap = useMemo(
    () => Object.fromEntries(quotations.map((q) => [q.id, q])),
    [quotations],
  );

  const [soldDate, setSoldDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [soldTotal, setSoldTotal] = useState(0);
  const [initialDocumentQtyByQuotation, setInitialDocumentQtyByQuotation] =
    useState<Record<string, number>>({});
  const [linkedPayment, setLinkedPayment] = useState<LinkedPayment | null>(
    null,
  );
  const [linkedPaymentLoading, setLinkedPaymentLoading] = useState(false);
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !params.id) {
      setItems([]);
      setSoldTotal(0);
      setInitialDocumentQtyByQuotation({});
      setLinkedPayment(null);
      setLinkedPaymentLoading(false);
      setPaymentDrawerOpen(false);
      return;
    }
    setLinkedPayment(null);
    setPaymentDrawerOpen(false);
    setLinkedPaymentLoading(true);
    void api.query(GET_SOLD, { id: params.id }).then((result) => {
      const sold = result?.consignmentSold;
      if (!sold) {
        setLinkedPaymentLoading(false);
        return;
      }
      setStoreId(String(sold.storeId));
      setSoldDate(isoDate(sold.soldDate));
      setSoldTotal(Number(sold.total ?? 0));
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
          acc[quotationId] =
            (acc[quotationId] ?? 0) + Number(item.quantity ?? 0);
          return acc;
        },
        {},
      );
      setInitialDocumentQtyByQuotation(baseline);

      void api
        .query(GET_LINKED_PAYMENT, { storeId: String(sold.storeId) })
        .then((paymentResult) => {
          const payment = (paymentResult?.consignmentPayments ?? []).find(
            (item) => String(item.soldId ?? "") === String(sold.id),
          );
          setLinkedPayment((payment as LinkedPayment | undefined) ?? null);
        })
        .finally(() => {
          setLinkedPaymentLoading(false);
        });
    });
  }, [isNew, params.id]);

  async function createPaymentForSold() {
    if (!params.id || isNew) return;
    setCreatingPayment(true);
    try {
      if (linkedPaymentLoading) {
        return;
      }
      if (linkedPayment) {
        setPaymentDrawerOpen(true);
        return;
      }
      const result = await api.mutate(CREATE_PAYMENT, {
        input: {
          storeId,
          paymentDate: toDateTimeInput(
            isoDate(soldDate) || new Date().toISOString().slice(0, 10),
          ),
          paymentPolicy: null,
          paymentMethod: "Cash",
          paymentStatus: "Pending",
          subtotal: soldTotal,
          discount: 0,
          soldId: params.id,
        },
      });
      const paymentId = result?.createConsignmentPayment?.id;
      if (!paymentId) {
        throw new Error("Cannot create payment");
      }
      toast.success("Payment created successfully");
      navigate({ to: `/consignment/payments/${paymentId}` });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setCreatingPayment(false);
    }
  }

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
          toast.success("Sold record created successfully");
          navigate({ to: `/consignment/solds/${id}` });
        }
      } else {
        const { storeId: soldStoreId, ...updateInput } = input;
        await api.mutate(UPDATE_SOLD, {
          input: { id: params.id, ...updateInput },
        });
        toast.success("Sold record updated successfully");
        navigate({
          to: "/consignment/solds",
          search: { storeId: soldStoreId },
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
    if (!window.confirm("Delete this sold record?")) return;
    try {
      await api.mutate(DELETE_SOLD, { id: params.id });
      toast.success("Sold record deleted successfully");
      navigate({ to: "/consignment/solds", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const subtotalPreview = items.reduce((sum, item) => {
    return sum + item.consignmentPriceSnapshot * item.quantity;
  }, 0);

  function printReceipt() {
    const storeName = selectedStore
      ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ""}`
      : `Store #${storeId}`;
    const fmt = (minor: number) => formatMinorCurrency(minor, currency);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const opened = openPrintWindow({
      title: "Sales Confirmation",
      id: String(params.id),
      metaFields: [
        { label: "Consignment Store", value: storeName },
        { label: "Sold Date", value: soldDate },
      ],
      columns: [
        { header: "Product" },
        { header: "SKU", className: "mono" },
        { header: "Unit Price", className: "num" },
        { header: "Qty", className: "num" },
        { header: "Subtotal", className: "num" },
      ],
      rows: items.map((item) => {
        const q = quotationMap[item.quotationId];
        return [
          q?.productVariantName ?? `Quotation #${item.quotationId}`,
          q?.productVariantSku ?? "—",
          fmt(item.consignmentPriceSnapshot),
          String(item.quantity),
          fmt(item.consignmentPriceSnapshot * item.quantity),
        ];
      }),
      footerRow: ["Total", "", "", String(totalQty), fmt(subtotalPreview)],
    });
    if (!opened) {
      toast.error("Popup was blocked. Please allow popups for this site.");
    }
  }

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
            linkedPaymentLoading ? (
              <Button variant="secondary" disabled>
                Checking linked payment...
              </Button>
            ) : linkedPayment ? (
              <Button
                variant="secondary"
                onClick={() => setPaymentDrawerOpen(true)}
              >
                Payment details
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={createPaymentForSold}
                disabled={creatingPayment || !storeId}
              >
                {creatingPayment
                  ? "Creating payment..."
                  : "Create payment for this sold"}
              </Button>
            )
          ) : null}
          {!isNew ? (
            <Button
              variant="secondary"
              onClick={printReceipt}
              disabled={quotationsLoading}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          ) : null}
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
      {!isNew ? (
        <div>
          <span
            className={
              linkedPayment
                ? "inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                : "inline-flex items-center rounded-full border border-muted-foreground/20 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            }
          >
            {linkedPayment
              ? `Linked payment: #${linkedPayment.id}`
              : linkedPaymentLoading
                ? "Linked payment: checking..."
                : "No linked payment"}
          </span>
        </div>
      ) : null}

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

      {linkedPayment && paymentDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment details</h3>
              <Button
                variant="ghost"
                onClick={() => setPaymentDrawerOpen(false)}
              >
                Close
              </Button>
            </div>
            <Card className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Payment ID</div>
                <div>{linkedPayment.id}</div>
                <div className="text-muted-foreground">Date</div>
                <div>{isoDate(linkedPayment.paymentDate)}</div>
                <div className="text-muted-foreground">Method</div>
                <div>{linkedPayment.paymentMethod}</div>
                <div className="text-muted-foreground">Status</div>
                <div>{linkedPayment.paymentStatus}</div>
                <div className="text-muted-foreground">Policy</div>
                <div>{linkedPayment.paymentPolicy ?? "-"}</div>
                <div className="text-muted-foreground">Subtotal</div>
                <div>{formatCurrency(linkedPayment.subtotal, "USD")}</div>
                <div className="text-muted-foreground">Discount</div>
                <div>{formatCurrency(linkedPayment.discount, "USD")}</div>
                <div className="text-muted-foreground">Total</div>
                <div>{formatCurrency(linkedPayment.total, "USD")}</div>
              </div>
              <Button
                onClick={() =>
                  navigate({ to: `/consignment/payments/${linkedPayment.id}` })
                }
              >
                Open payment page
              </Button>
            </Card>
          </div>
        </div>
      ) : null}
    </SimplePage>
  );
}
