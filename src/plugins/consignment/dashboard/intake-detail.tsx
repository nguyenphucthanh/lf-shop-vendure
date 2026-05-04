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
        navigate({ to: "/consignment/intakes", search: { storeId } });
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
              <FieldLabel>Default discount</FieldLabel>
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
