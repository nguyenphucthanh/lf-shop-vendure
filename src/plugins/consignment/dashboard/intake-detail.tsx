import {
  AnyRoute,
  api,
  Button,
  Card,
  Field,
  FieldContent,
  FieldLabel,
  Input,
} from "@vendure/dashboard";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import { Printer } from "lucide-react";

import { graphql } from "@/gql";
import {
  getApiErrorMessage,
  LineItemsEditor,
  SimplePage,
  isoDate,
  toDateTimeInput,
  useQuotations,
  useStore,
  openPrintWindow,
  formatMinorCurrency,
} from "./shared";

const GET_INTAKE = graphql(`
  query ConsignmentIntakeDetail($id: ID!) {
    consignmentIntake(id: $id) {
      id
      storeId
      intakeDate
      paymentPolicy
      deliveryMethod
      deliveryTrackingCode
      deliveryCost
      total
      items {
        quotationId
        quantity
        consignmentPriceSnapshot
        currency
      }
    }
  }
`);

const CREATE_INTAKE = graphql(`
  mutation CreateConsignmentIntake($input: CreateConsignmentIntakeInput!) {
    createConsignmentIntake(input: $input) {
      id
    }
  }
`);

const UPDATE_INTAKE = graphql(`
  mutation UpdateConsignmentIntake($input: UpdateConsignmentIntakeInput!) {
    updateConsignmentIntake(input: $input) {
      id
    }
  }
`);

const DELETE_INTAKE = graphql(`
  mutation DeleteConsignmentIntake($id: ID!) {
    deleteConsignmentIntake(id: $id)
  }
`);

export function IntakeDetailPage({ route }: { route: AnyRoute }) {
  const params = route.useParams();
  const navigate = route.useNavigate();
  const isNew = params.id === "new";
  const search = route.useSearch();

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);
  const { quotations, loading: quotationsLoading } = useQuotations(storeId);
  const quotationMap = useMemo(
    () => Object.fromEntries(quotations.map((q) => [q.id, q])),
    [quotations],
  );
  const [intakeDate, setIntakeDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentPolicy, setPaymentPolicy] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliveryTrackingCode, setDeliveryTrackingCode] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("0");
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
    void api.query(GET_INTAKE, { id: params.id }).then((result) => {
      const intake = result?.consignmentIntake;
      if (!intake) return;
      setStoreId(intake.storeId);
      setIntakeDate(isoDate(intake.intakeDate));
      setPaymentPolicy(intake.paymentPolicy ?? "");
      setDeliveryMethod(intake.deliveryMethod ?? "");
      setDeliveryTrackingCode(intake.deliveryTrackingCode ?? "");
      setDeliveryCost(String((intake.deliveryCost ?? 0) / 100));
      setItems(
        (intake.items ?? []).map((item) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot ?? 0,
          currency: item.currency || "USD",
        })),
      );
    });
  }, [isNew, params.id]);

  function printReceipt() {
    const storeName = selectedStore
      ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ""}`
      : `Store #${storeId}`;
    const currency = items[0]?.currency ?? "USD";
    const fmt = (minor: number) => formatMinorCurrency(minor, currency);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalValue = items.reduce(
      (s, i) => s + i.consignmentPriceSnapshot * i.quantity,
      0,
    );
    const opened = openPrintWindow({
      title: "Intake Receipt",
      id: String(params.id),
      metaFields: [
        { label: "Consignment Store", value: storeName },
        { label: "Intake Date", value: intakeDate },
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
      footerRow: ["Total", "", "", String(totalQty), fmt(totalValue)],
    });
    if (!opened) {
      toast.error("Popup was blocked. Please allow popups for this site.");
    }
  }

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
        intakeDate: toDateTimeInput(intakeDate),
        paymentPolicy: paymentPolicy || null,
        deliveryMethod: deliveryMethod || null,
        deliveryTrackingCode: deliveryTrackingCode || null,
        deliveryCost: Math.round(Number(deliveryCost || 0) * 100),
        items: mutationItems,
      };
      if (isNew) {
        const result = await api.mutate(CREATE_INTAKE, { input });
        const id = result?.createConsignmentIntake?.id;
        if (id) {
          toast.success("Intake created successfully");
          navigate({ to: `/consignment/intakes/${id}` });
        }
      } else {
        const { storeId, ...nextInput } = input;
        await api.mutate(UPDATE_INTAKE, {
          input: { id: params.id, ...nextInput },
        });
        toast.success("Intake updated successfully");
        navigate({ to: "/consignment/intakes", search: { storeId } });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this intake?")) return;
    try {
      await api.mutate(DELETE_INTAKE, { id: params.id });
      toast.success("Intake deleted successfully");
      navigate({ to: "/consignment/intakes", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <SimplePage
      title={isNew ? "New Intake" : "Edit Intake"}
      actions={
        <>
          {!isNew ? (
            <>
              <Button
                variant="secondary"
                onClick={printReceipt}
                disabled={quotationsLoading}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="ghost" onClick={remove}>
                Delete
              </Button>
            </>
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
              <FieldLabel>Intake date</FieldLabel>
              <FieldContent>
                <Input
                  type="date"
                  value={intakeDate}
                  onChange={(event) => setIntakeDate(event.target.value)}
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
                  placeholder="COD, Pay later"
                />
              </FieldContent>
            </Field>
          </div>
          <div className="space-y-2 col-span-4">
            <Field>
              <FieldLabel>Delivery method</FieldLabel>
              <FieldContent>
                <Input
                  value={deliveryMethod}
                  onChange={(event) => setDeliveryMethod(event.target.value)}
                  placeholder="Self delivery, External"
                />
              </FieldContent>
            </Field>
          </div>
          <div className="space-y-2 col-span-4">
            <Field>
              <FieldLabel>Tracking code</FieldLabel>
              <FieldContent>
                <Input
                  value={deliveryTrackingCode}
                  onChange={(event) =>
                    setDeliveryTrackingCode(event.target.value)
                  }
                />
              </FieldContent>
            </Field>
          </div>
          <div className="space-y-2 col-span-4">
            <Field>
              <FieldLabel>Delivery cost</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryCost}
                  onChange={(event) => setDeliveryCost(event.target.value)}
                />
              </FieldContent>
            </Field>
          </div>
        </div>
      </Card>
      <LineItemsEditor storeId={storeId} value={items} onChange={setItems} />
    </SimplePage>
  );
}
