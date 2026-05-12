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
  ConsignmentHistoryPanel,
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
        subtotal
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

const GET_ACTIVE_SETTLEMENT = graphql(`
  query ConsignmentActiveSettlement($storeId: ID!) {
    consignmentActiveSettlement(storeId: $storeId) {
      id
      status
      settlementDate
      approvedAt
      paidAt
      closedAt
    }
  }
`);

const CREATE_SETTLEMENT = graphql(`
  mutation CreateConsignmentSettlement(
    $input: CreateConsignmentSettlementInput!
  ) {
    createConsignmentSettlement(input: $input) {
      id
      status
      settlementDate
    }
  }
`);

const APPROVE_SETTLEMENT = graphql(`
  mutation ApproveConsignmentSettlement($id: ID!) {
    approveConsignmentSettlement(id: $id) {
      id
      status
      approvedAt
    }
  }
`);

const MARK_SETTLEMENT_AS_PAID = graphql(`
  mutation MarkSettlementAsPaid($id: ID!) {
    markConsignmentSettlementAsPaid(id: $id) {
      id
      status
      paidAt
    }
  }
`);

const CLOSE_SETTLEMENT = graphql(`
  mutation CloseConsignmentSettlement($id: ID!) {
    closeConsignmentSettlement(id: $id) {
      id
      status
      closedAt
    }
  }
`);

type SoldOption = {
  id: string;
  soldDate: string;
  total: number;
  items?: Array<{
    id: string;
    quantity: number;
    subtotal: number;
    quotation?: {
      consignmentPrice?: number | null;
      productVariantSku?: string | null;
      productVariantName?: string | null;
    } | null;
  }>;
};

type Settlement = {
  id: string;
  status: "OPEN" | "APPROVED" | "PAID" | "CLOSED";
  settlementDate: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  closedAt?: string | null;
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
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementActionLoading, setSettlementActionLoading] = useState(false);
  const [showCreateSettlementDialog, setShowCreateSettlementDialog] =
    useState(false);
  const [newSettlementDate, setNewSettlementDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [newSettlementDescription, setNewSettlementDescription] = useState("");

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
      setSettlement(null);
      return;
    }
    let active = true;
    void api.query(GET_SOLD_OPTIONS, { storeId }).then((result) => {
      if (!active) return;
      setSoldOptions((result?.consignmentSolds ?? []) as SoldOption[]);
    });
    setSettlementLoading(true);
    void api
      .query(GET_ACTIVE_SETTLEMENT, { storeId })
      .then((result) => {
        if (!active) return;
        const settlement = (result?.consignmentActiveSettlement ??
          null) as Settlement | null;
        setSettlement(settlement);
      })
      .finally(() => {
        if (active) setSettlementLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId]);

  useEffect(() => {
    if (isNew || !params.id) {
      return;
    }
    let active = true;
    void api.query(GET_PAYMENT, { id: params.id }).then((result) => {
      if (!active) return;
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
    return () => {
      active = false;
    };
  }, [isNew, params.id]);

  async function createSettlement() {
    if (!storeId) return;
    setSettlementActionLoading(true);
    try {
      const result = await api.mutate(CREATE_SETTLEMENT, {
        input: {
          storeId,
          settlementDate: toDateTimeInput(newSettlementDate),
          description: newSettlementDescription || null,
        },
      });
      if (result?.createConsignmentSettlement) {
        setSettlement(result.createConsignmentSettlement as Settlement);
        setShowCreateSettlementDialog(false);
        setNewSettlementDate(new Date().toISOString().slice(0, 10));
        setNewSettlementDescription("");
        toast.success("Settlement created successfully");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSettlementActionLoading(false);
    }
  }

  async function approveSettlement() {
    if (!settlement?.id) return;
    setSettlementActionLoading(true);
    try {
      const result = await api.mutate(APPROVE_SETTLEMENT, {
        id: settlement.id,
      });
      if (result?.approveConsignmentSettlement) {
        setSettlement(result.approveConsignmentSettlement as Settlement);
        toast.success("Settlement approved");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSettlementActionLoading(false);
    }
  }

  async function markSettlementAsPaid() {
    if (!settlement?.id) return;
    setSettlementActionLoading(true);
    try {
      const result = await api.mutate(MARK_SETTLEMENT_AS_PAID, {
        id: settlement.id,
      });
      if (result?.markConsignmentSettlementAsPaid) {
        setSettlement(result.markConsignmentSettlementAsPaid as Settlement);
        toast.success("Settlement marked as paid");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSettlementActionLoading(false);
    }
  }

  async function closeSettlement() {
    if (!settlement?.id) return;
    setSettlementActionLoading(true);
    try {
      const result = await api.mutate(CLOSE_SETTLEMENT, {
        id: settlement.id,
      });
      if (result?.closeConsignmentSettlement) {
        setSettlement(result.closeConsignmentSettlement as Settlement);
        toast.success("Settlement closed");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSettlementActionLoading(false);
    }
  }

  async function save() {
    const status = settlement?.status;
    const isSettlementEditable = status === "OPEN" || status === "APPROVED";
    if (!isSettlementEditable) {
      toast.error(
        "An active settlement in OPEN or APPROVED status is required before saving payments.",
      );
      return;
    }

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

  function handleSelectSold(soldIdValue: string) {
    setSoldId(soldIdValue);

    // If subtotal is empty or zero, auto-populate with sold total
    const currentSubtotal = Number(subtotal || 0);
    if (currentSubtotal === 0) {
      const sold = soldOptions.find((option) => option.id === soldIdValue);
      if (sold) {
        setSubtotal(String(sold.total / 100));
      }
    }
  }

  const subtotalValue = Math.round(Number(subtotal || 0) * 100);
  const discountValue = Math.round(Number(discount || 0) * 100);
  const totalValue = subtotalValue - discountValue;
  const selectedSold =
    soldOptions.find((option) => option.id === soldId) ?? null;
  const settlementStatus = settlement?.status ?? null;
  const isSettlementEditable =
    settlementStatus === "OPEN" || settlementStatus === "APPROVED";

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
          <Button
            onClick={save}
            disabled={saving || !storeId || !isSettlementEditable}
          >
            {saving ? "Saving..." : "Save Payment"}
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

          {/* Settlement Section */}
          <div className="space-y-2 col-span-12">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-amber-900">Settlement</h3>
                {settlement && (
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      settlement.status === "OPEN"
                        ? "bg-blue-100 text-blue-800"
                        : settlement.status === "APPROVED"
                          ? "bg-purple-100 text-purple-800"
                          : settlement.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {settlement.status}
                  </span>
                )}
              </div>

              {settlementLoading ? (
                <div className="text-sm text-gray-600">
                  Loading settlement...
                </div>
              ) : settlement ? (
                <div className="space-y-2" role="status" aria-live="polite">
                  <p className="text-sm text-amber-900">
                    {settlement.status === "OPEN"
                      ? "Settlement is open and accepting payments."
                      : settlement.status === "APPROVED"
                        ? "Settlement is approved and still accepts payment updates."
                        : settlement.status === "PAID"
                          ? "Settlement is marked as paid. Payment details are view-only."
                          : "Settlement is closed and finalized."}
                  </p>
                  <div className="text-sm">
                    <strong>Date:</strong>{" "}
                    {new Date(settlement.settlementDate).toLocaleDateString()}
                  </div>
                  {settlement.approvedAt && (
                    <div className="text-sm">
                      <strong>Approved:</strong>{" "}
                      {new Date(settlement.approvedAt).toLocaleString()}
                    </div>
                  )}
                  {settlement.paidAt && (
                    <div className="text-sm">
                      <strong>Paid:</strong>{" "}
                      {new Date(settlement.paidAt).toLocaleString()}
                    </div>
                  )}
                  {settlement.closedAt && (
                    <div className="text-sm">
                      <strong>Closed:</strong>{" "}
                      {new Date(settlement.closedAt).toLocaleString()}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settlement.status === "OPEN" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={approveSettlement}
                        disabled={settlementActionLoading}
                      >
                        {settlementActionLoading ? "..." : "Approve Settlement"}
                      </Button>
                    ) : null}
                    {settlement.status === "APPROVED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={markSettlementAsPaid}
                        disabled={settlementActionLoading}
                      >
                        {settlementActionLoading ? "..." : "Mark as Paid"}
                      </Button>
                    ) : null}
                    {settlement.status === "PAID" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={closeSettlement}
                        disabled={settlementActionLoading}
                      >
                        {settlementActionLoading ? "..." : "Close Settlement"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-amber-800">
                    No active settlement found. Create one to record payments.
                  </p>
                  {showCreateSettlementDialog ? (
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={newSettlementDate}
                        onChange={(e) => setNewSettlementDate(e.target.value)}
                        placeholder="Settlement date"
                      />
                      <Input
                        value={newSettlementDescription}
                        onChange={(e) =>
                          setNewSettlementDescription(e.target.value)
                        }
                        placeholder="Description (optional)"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={createSettlement}
                          disabled={settlementActionLoading}
                        >
                          {settlementActionLoading ? "Creating..." : "Create"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCreateSettlementDialog(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setShowCreateSettlementDialog(true)}
                    >
                      Create Settlement
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {isSettlementEditable ? (
            <>
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
                    Computed total:{" "}
                    {formatCurrency(totalValue, defaultCurrency)}
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
                      onChange={(event) => handleSelectSold(event.target.value)}
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
                      setShowSoldItems(
                        (event.target as HTMLDetailsElement).open,
                      )
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
                            <TableHead className="text-right">
                              Subtotal
                            </TableHead>
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
                                  Number(item.subtotal ?? 0),
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
            </>
          ) : (
            <>
              <div className="col-span-12 rounded-md border border-l-4 border-l-amber-400 border-amber-100 bg-amber-50/50 p-4 text-sm">
                <p className="text-amber-900 font-medium mb-2">
                  {settlementStatus === "PAID"
                    ? "Settlement marked as paid — payment details are read-only."
                    : settlementStatus === "CLOSED"
                      ? "Settlement closed — payment details are read-only."
                      : "No settlement yet — create one to enable payment edits."}
                </p>
              </div>

              <div className="space-y-2 col-span-6">
                <Field>
                  <FieldLabel>Payment date</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">{paymentDate}</div>
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-2 col-span-6">
                <Field>
                  <FieldLabel>Payment policy</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">
                      {paymentPolicy || "-"}
                    </div>
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-2 col-span-6">
                <Field>
                  <FieldLabel>Payment method</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">{paymentMethod}</div>
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-2 col-span-6">
                <Field>
                  <FieldLabel>Payment status</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">{paymentStatus}</div>
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-2 col-span-6">
                <Field>
                  <FieldLabel>Subtotal</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">
                      {formatCurrency(subtotalValue, defaultCurrency)}
                    </div>
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-2 col-span-6">
                <Field>
                  <FieldLabel>Discount</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">
                      {formatCurrency(discountValue, defaultCurrency)}
                    </div>
                  </FieldContent>
                  <FieldDescription>
                    Computed total:{" "}
                    {formatCurrency(totalValue, defaultCurrency)}
                  </FieldDescription>
                </Field>
              </div>

              <div className="space-y-2 col-span-12">
                <Field>
                  <FieldLabel>Linked sold (optional)</FieldLabel>
                  <FieldContent>
                    <div className="text-sm text-gray-700">
                      {selectedSold
                        ? `${String(selectedSold.soldDate).slice(0, 10)} - ${selectedSold.items?.length ?? 0} items - ${formatCurrency(selectedSold.total, defaultCurrency)}`
                        : "Not linked"}
                    </div>
                  </FieldContent>
                </Field>
              </div>

              {selectedSold ? (
                <div className="space-y-2 col-span-12">
                  <details
                    className="rounded-md border"
                    open={showSoldItems}
                    onToggle={(event) =>
                      setShowSoldItems(
                        (event.target as HTMLDetailsElement).open,
                      )
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
                            <TableHead className="text-right">
                              Subtotal
                            </TableHead>
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
                                  Number(
                                    item.quotation?.consignmentPrice ?? 0,
                                  ) * Number(item.quantity ?? 0),
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
            </>
          )}
        </div>
      </Card>

      {!isNew ? (
        <ConsignmentHistoryPanel objectType="PAYMENT" objectId={params.id} />
      ) : null}
    </SimplePage>
  );
}
