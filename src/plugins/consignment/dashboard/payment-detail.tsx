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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useChannel,
  useLocalFormat,
} from "@vendure/dashboard";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

import {
  formatMinorCurrency,
  getApiErrorMessage,
  openPrintWindow,
  SimplePage,
  isoDate,
  toDateTimeInput,
  useStore,
} from "./shared";

const GET_SOLD_OPTIONS = graphql(`
  query ConsignmentSoldOptionsForPayment($storeId: ID!) {
    consignmentSolds(storeId: $storeId) {
      id
      soldDate
      total
      items {
        id
        quantity
        quotation {
          consignmentPrice
          productVariantSku
          productVariantName
        }
      }
    }
  }
`);

const GET_PAYMENT = graphql(`
  query ConsignmentPaymentDetail($id: ID!) {
    consignmentPayment(id: $id) {
      id
      storeId
      paymentDate
      paymentPolicy
      paymentMethod
      paymentStatus
      subtotal
      discount
      total
      soldId
    }
  }
`);

const CREATE_PAYMENT = graphql(`
  mutation CreateConsignmentPayment($input: CreateConsignmentPaymentInput!) {
    createConsignmentPayment(input: $input) {
      id
    }
  }
`);

const UPDATE_PAYMENT = graphql(`
  mutation UpdateConsignmentPayment($input: UpdateConsignmentPaymentInput!) {
    updateConsignmentPayment(input: $input) {
      id
    }
  }
`);

const DELETE_PAYMENT = graphql(`
  mutation DeleteConsignmentPayment($id: ID!) {
    deleteConsignmentPayment(id: $id)
  }
`);

type SoldOption = {
  id: string;
  soldDate: string;
  total: number;
  items?: Array<{
    id: string;
    quantity: number;
    quotation?: {
      consignmentPrice?: number | null;
      productVariantSku?: string | null;
      productVariantName?: string | null;
    } | null;
  }>;
};

export function PaymentDetailPage({ route }: { route: AnyRoute }) {
  const { formatCurrency } = useLocalFormat();
  const { activeChannel } = useChannel();
  const navigate = route.useNavigate();
  const params = route.useParams();
  const isNew = params.id === "new";
  const search = route.useSearch();

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);
  const [soldOptions, setSoldOptions] = useState<SoldOption[]>([]);

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentPolicy, setPaymentPolicy] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [subtotal, setSubtotal] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [soldId, setSoldId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSoldItems, setShowSoldItems] = useState(true);
  const defaultCurrency = activeChannel?.defaultCurrencyCode ?? "USD";

  useEffect(() => {
    if (!storeId) {
      setSoldOptions([]);
      return;
    }
    void api.query(GET_SOLD_OPTIONS, { storeId }).then((result) => {
      setSoldOptions((result?.consignmentSolds ?? []) as SoldOption[]);
    });
  }, [storeId]);

  useEffect(() => {
    if (isNew || !params.id) {
      return;
    }
    void api.query(GET_PAYMENT, { id: params.id }).then((result) => {
      const payment = result?.consignmentPayment;
      if (!payment) return;
      setStoreId(payment.storeId);
      setPaymentDate(isoDate(payment.paymentDate));
      setPaymentPolicy(payment.paymentPolicy ?? "");
      setPaymentMethod(payment.paymentMethod ?? "Cash");
      setPaymentStatus(payment.paymentStatus ?? "Pending");
      setSubtotal(String((payment.subtotal ?? 0) / 100));
      setDiscount(String((payment.discount ?? 0) / 100));
      setSoldId(payment.soldId ? String(payment.soldId) : "");
    });
  }, [isNew, params.id]);

  async function save() {
    setSaving(true);
    try {
      const input = {
        storeId,
        paymentDate: toDateTimeInput(paymentDate),
        paymentPolicy: paymentPolicy || null,
        paymentMethod,
        paymentStatus,
        subtotal: Math.round(Number(subtotal || 0) * 100),
        discount: Math.round(Number(discount || 0) * 100),
        soldId: soldId || null,
      };
      if (isNew) {
        const result = await api.mutate(CREATE_PAYMENT, { input });
        const id = result?.createConsignmentPayment?.id;
        if (id) {
          toast.success("Payment created successfully");
          navigate({ to: `/consignment/payments/${id}` });
        }
      } else {
        const { storeId: paymentStoreId, ...updateInput } = input;
        await api.mutate(UPDATE_PAYMENT, {
          input: { id: params.id, ...updateInput },
        });
        toast.success("Payment updated successfully");
        navigate({
          to: "/consignment/payments",
          search: { storeId: paymentStoreId },
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
    if (!window.confirm("Delete this payment?")) return;
    try {
      await api.mutate(DELETE_PAYMENT, { id: params.id });
      toast.success("Payment deleted successfully");
      navigate({ to: "/consignment/payments", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  function printReceipt() {
    const storeName = selectedStore
      ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ""}`
      : `Store #${storeId}`;
    const currency = defaultCurrency;
    const fmt = (minor: number) => formatMinorCurrency(minor, currency);

    const linkedRows = (selectedSold?.items ?? []).map((item) => {
      const price = Number(item.quotation?.consignmentPrice ?? 0);
      const qty = Number(item.quantity ?? 0);
      return [
        item.quotation?.productVariantName ?? "-",
        item.quotation?.productVariantSku ?? "-",
        String(qty),
        fmt(price * qty),
      ];
    });
    const linkedTotalQty = (selectedSold?.items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0,
    );

    const opened = openPrintWindow({
      title: "Payment Receipt",
      id: String(params.id),
      metaFields: [
        { label: "Consignment Store", value: storeName },
        { label: "Payment Date", value: paymentDate },
        { label: "Payment Method", value: paymentMethod || "-" },
        { label: "Subtotal", value: fmt(subtotalValue) },
        { label: "Discount", value: fmt(discountValue) },
        { label: "Total", value: fmt(totalValue) },
      ],
      columns: [
        { header: "Product" },
        { header: "SKU", className: "mono" },
        { header: "Qty", className: "num" },
        { header: "Subtotal", className: "num" },
      ],
      rows:
        selectedSold && linkedRows.length > 0
          ? linkedRows
          : [["No linked sold items", "-", "0", fmt(0)]],
      footerRow: [
        selectedSold ? "Sold items total" : "Items total",
        "",
        String(selectedSold ? linkedTotalQty : 0),
        fmt(selectedSold?.total ?? 0),
      ],
    });

    if (!opened) {
      toast.error("Popup was blocked. Please allow popups for this site.");
    }
  }

  const subtotalValue = Math.round(Number(subtotal || 0) * 100);
  const discountValue = Math.round(Number(discount || 0) * 100);
  const totalValue = subtotalValue - discountValue;
  const selectedSold =
    soldOptions.find((option) => option.id === soldId) ?? null;

  return (
    <SimplePage
      title={isNew ? "New Payment" : "Edit Payment"}
      actions={
        <>
          {!isNew ? (
            <Button variant="secondary" onClick={printReceipt}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          ) : null}
          {!isNew ? (
            <Button variant="ghost" onClick={remove}>
              Delete
            </Button>
          ) : null}
          <Button onClick={save} disabled={saving || !storeId}>
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
              <FieldLabel>Payment date</FieldLabel>
              <FieldContent>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Payment policy</FieldLabel>
              <FieldContent>
                <Input
                  value={paymentPolicy}
                  onChange={(event) => setPaymentPolicy(event.target.value)}
                  placeholder="Pay now, Pay later"
                />
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Payment method</FieldLabel>
              <FieldContent>
                <select
                  title="Payment method"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank transfer">Bank transfer</option>
                </select>
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Payment status</FieldLabel>
              <FieldContent>
                <select
                  title="Payment status"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Subtotal</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={subtotal}
                  onChange={(event) => setSubtotal(event.target.value)}
                />
              </FieldContent>
            </Field>
          </div>

          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Discount</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </FieldContent>
              <FieldDescription>
                Computed total: {formatCurrency(totalValue, defaultCurrency)}
              </FieldDescription>
            </Field>
          </div>

          <div className="space-y-2 col-span-12">
            <Field>
              <FieldLabel>Linked sold (optional)</FieldLabel>
              <FieldContent>
                <select
                  title="Linked sold"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={soldId}
                  onChange={(event) => setSoldId(event.target.value)}
                >
                  <option value="">Not linked</option>
                  {soldOptions.map((option) => (
                    <option value={option.id} key={option.id}>
                      {String(option.soldDate).slice(0, 10)} -{" "}
                      {option.items?.length ?? 0} items -{" "}
                      {formatCurrency(option.total, defaultCurrency)}
                    </option>
                  ))}
                </select>
              </FieldContent>
            </Field>
          </div>

          {selectedSold ? (
            <div className="space-y-2 col-span-12">
              <details
                className="rounded-md border"
                open={showSoldItems}
                onToggle={(event) =>
                  setShowSoldItems((event.target as HTMLDetailsElement).open)
                }
              >
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">
                  Sold items ({selectedSold.items?.length ?? 0})
                </summary>
                <div className="px-3 pb-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedSold.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.quotation?.productVariantSku ?? "-"}
                          </TableCell>
                          <TableCell>
                            {item.quotation?.productVariantName ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              Number(item.quotation?.consignmentPrice ?? 0) *
                                Number(item.quantity ?? 0),
                              defaultCurrency,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(selectedSold.items?.length ?? 0) === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-sm text-muted-foreground"
                          >
                            No sold items found.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </div>
          ) : null}
        </div>
      </Card>
    </SimplePage>
  );
}
