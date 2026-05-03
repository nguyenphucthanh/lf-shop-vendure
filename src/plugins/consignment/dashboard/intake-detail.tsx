import { AnyRoute, api, Button, Card, Input } from "@vendure/dashboard";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

import {
  LineItemsEditor,
  SimplePage,
  isoDate,
  toDateTimeInput,
  useStore,
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
        (intake.items ?? []).map((item: any) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot ?? 0,
        })),
      );
    });
  }, [isNew, params.id]);

  async function save() {
    setSaving(true);
    try {
      const input = {
        storeId,
        intakeDate: toDateTimeInput(intakeDate),
        paymentPolicy: paymentPolicy || null,
        deliveryMethod: deliveryMethod || null,
        deliveryTrackingCode: deliveryTrackingCode || null,
        deliveryCost: Math.round(Number(deliveryCost || 0) * 100),
        items,
      };
      if (isNew) {
        const result = await api.mutate(CREATE_INTAKE, { input });
        const id = (result as any)?.createConsignmentIntake?.id;
        if (id) {
          navigate({ to: `/consignment/intakes/${id}` });
        }
      } else {
        await api.mutate(UPDATE_INTAKE, { input: { id: params.id, ...input } });
        navigate({ to: "/consignment/intakes" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this intake?")) return;
    await api.mutate(DELETE_INTAKE, { id: params.id });
    navigate({ to: "/consignment/intakes" });
  }

  return (
    <SimplePage
      title={isNew ? "New Intake" : "Edit Intake"}
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Consignment Store</label>
            <div className="rounded-md border px-3 py-2 text-sm">
              {selectedStore
                ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ""}`
                : storeId
                  ? `Store #${storeId}`
                  : "Not selected"}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Intake date</label>
            <Input
              type="date"
              value={intakeDate}
              onChange={(event) => setIntakeDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment policy</label>
            <Input
              value={paymentPolicy}
              onChange={(event) => setPaymentPolicy(event.target.value)}
              placeholder="COD, Pay later"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery method</label>
            <Input
              value={deliveryMethod}
              onChange={(event) => setDeliveryMethod(event.target.value)}
              placeholder="Self delivery, External"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tracking code</label>
            <Input
              value={deliveryTrackingCode}
              onChange={(event) => setDeliveryTrackingCode(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery cost</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={deliveryCost}
              onChange={(event) => setDeliveryCost(event.target.value)}
            />
          </div>
        </div>
      </Card>
      <LineItemsEditor storeId={storeId} value={items} onChange={setItems} />
    </SimplePage>
  );
}
