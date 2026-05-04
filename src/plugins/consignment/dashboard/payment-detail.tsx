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
  useLocalFormat,
} from "@vendure/dashboard";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

import {
  getApiErrorMessage,
  LineItemsEditor,
  SimplePage,
  isoDate,
  toDateTimeInput,
  useStore,
} from "./shared";

const GET_PAYMENT = graphql(`
  query ConsignmentPaymentDetail($id: ID!) {
    consignmentPayment(id: $id) {
      id
      storeId
      paymentDate
      paymentPolicy
      paymentMethod
      paymentStatus
      discount
      total
      paidAmount
      remainingAmount
      items {
        quotationId
        quantity
        consignmentPriceSnapshot
        currency
      }
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

export function PaymentDetailPage({ route }: { route: AnyRoute }) {
  const { formatCurrency } = useLocalFormat();
  const navigate = route.useNavigate();
  const params = route.useParams();
  const isNew = params.id === "new";
  const search = route.useSearch();

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentPolicy, setPaymentPolicy] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [items, setItems] = useState<
    Array<{
      quotationId: string;
      quantity: number;
      consignmentPriceSnapshot: number;
      currency: string;
    }>
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !params.id) return;
    void api.query(GET_PAYMENT, { id: params.id }).then((result) => {
      const payment = result?.consignmentPayment;
      if (!payment) return;
      setStoreId(payment.storeId);
      setPaymentDate(isoDate(payment.paymentDate));
      setPaymentPolicy(payment.paymentPolicy ?? "");
      setPaymentMethod(payment.paymentMethod ?? "Cash");
      setPaymentStatus(payment.paymentStatus ?? "Pending");
      setDiscount(String((payment.discount ?? 0) / 100));
      setPaidAmount(String((payment.paidAmount ?? 0) / 100));
      setItems(
        (payment.items ?? []).map((item) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot ?? 0,
          currency: item.currency || "USD",
        })),
      );
    });
  }, [isNew, params.id]);

  async function save() {
    setSaving(true);
    try {
      const mutationItems = items.map((item) => ({
        quotationId: item.quotationId,
        quantity: item.quantity,
        consignmentPriceSnapshot: item.consignmentPriceSnapshot,
      }));
      const input = {
        storeId,
        paymentDate: toDateTimeInput(paymentDate),
        paymentPolicy: paymentPolicy || null,
        paymentMethod,
        paymentStatus,
        discount: Math.round(Number(discount || 0) * 100),
        paidAmount: Math.round(Number(paidAmount || 0) * 100),
        items: mutationItems,
      };
      if (isNew) {
        const result = await api.mutate(CREATE_PAYMENT, { input });
        const id = result?.createConsignmentPayment?.id;
        if (id) {
          navigate({ to: `/consignment/payments/${id}` });
        }
      } else {
        const { storeId, ...updateInput } = input;
        await api.mutate(UPDATE_PAYMENT, {
          input: { id: params.id, ...updateInput },
        });
        navigate({ to: "/consignment/payments", search: { storeId } });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this payment?")) return;
    try {
      await api.mutate(DELETE_PAYMENT, { id: params.id });
      navigate({ to: "/consignment/payments", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <SimplePage
      title={isNew ? "New Payment" : "Edit Payment"}
      actions={
        <>
          {!isNew ? (
            <Button variant="ghost" onClick={remove}>
              Delete
            </Button>
          ) : null}
          <Button
            onClick={save}
            disabled={saving || !storeId || items.length === 0}
          >
            {saving ? "Saving…" : "Save"}
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
            </Field>
          </div>
          <div className="space-y-2 col-span-6">
            <Field>
              <FieldLabel>Paid amount</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                />
              </FieldContent>
              <FieldDescription>
                Current paid amount preview:{" "}
                {formatCurrency(
                  Number(paidAmount || 0),
                  items?.[0]?.currency || "USD",
                )}
              </FieldDescription>
            </Field>
          </div>
        </div>
      </Card>
      <LineItemsEditor
        storeId={storeId}
        value={items}
        onChange={setItems}
        calculateMaxQty="in-payment"
      />
    </SimplePage>
  );
}
