import {
  AnyRoute,
  api,
  Button,
  Card,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  Textarea,
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

const GET_RETURN = graphql(`
  query ConsignmentReturnDetail($id: ID!) {
    consignmentReturn(id: $id) {
      id
      storeId
      returnedDate
      reason
      items {
        quotationId
        quantity
        consignmentPriceSnapshot
      }
    }
  }
`);

const CREATE_RETURN = graphql(`
  mutation CreateConsignmentReturn($input: CreateConsignmentReturnInput!) {
    createConsignmentReturn(input: $input) {
      id
    }
  }
`);

const UPDATE_RETURN = graphql(`
  mutation UpdateConsignmentReturn($input: UpdateConsignmentReturnInput!) {
    updateConsignmentReturn(input: $input) {
      id
    }
  }
`);

const DELETE_RETURN = graphql(`
  mutation DeleteConsignmentReturn($id: ID!) {
    deleteConsignmentReturn(id: $id)
  }
`);

export function ReturnDetailPage({ route }: { route: AnyRoute }) {
  const navigate = route.useNavigate();
  const params = route.useParams();
  const isNew = params.id === "new";
  const search = route.useSearch();

  const [storeId, setStoreId] = useState(search?.storeId?.toString() ?? "");
  const { store: selectedStore } = useStore(storeId);
  const [returnedDate, setReturnedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<
    Array<{
      quotationId: string;
      quantity: number;
      consignmentPriceSnapshot: number;
      currency: string;
    }>
  >([]);
  const [initialReturnQtyByQuotation, setInitialReturnQtyByQuotation] =
    useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !params.id) {
      setInitialReturnQtyByQuotation({});
      return;
    }
    void api.query(GET_RETURN, { id: params.id }).then((result) => {
      const ret = result?.consignmentReturn;
      if (!ret) return;
      setStoreId(ret.storeId);
      setReturnedDate(isoDate(ret.returnedDate));
      setReason(ret.reason ?? "");
      setItems(
        (ret.items ?? []).map((item: any) => ({
          quotationId: item.quotationId,
          quantity: item.quantity,
          consignmentPriceSnapshot: item.consignmentPriceSnapshot ?? 0,
          currency: item.currency || "USD",
        })),
      );
      const baseline = (ret.items ?? []).reduce<Record<string, number>>(
        (acc, item: any) => {
          acc[item.quotationId] = (acc[item.quotationId] ?? 0) + item.quantity;
          return acc;
        },
        {},
      );
      setInitialReturnQtyByQuotation(baseline);
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
        returnedDate: toDateTimeInput(returnedDate),
        reason: reason || null,
        items: mutationItems,
      };
      if (isNew) {
        const result = await api.mutate(CREATE_RETURN, { input });
        const id = result?.createConsignmentReturn?.id;
        if (id) {
          toast.success("Return created successfully");
          navigate({ to: `/consignment/returns/${id}` });
        }
      } else {
        const { storeId, ...nextInput } = input;
        await api.mutate(UPDATE_RETURN, {
          input: { id: params.id, ...nextInput },
        });
        toast.success("Return updated successfully");
        navigate({ to: "/consignment/returns", search: { storeId } });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!window.confirm("Delete this return?")) return;
    try {
      await api.mutate(DELETE_RETURN, { id: params.id });
      toast.success("Return deleted successfully");
      navigate({ to: "/consignment/returns", search: { storeId } });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <SimplePage
      title={isNew ? "New Return" : "Edit Return"}
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
          <div className="space-y-2 col-span-12">
            <Field>
              <FieldLabel htmlFor="returnedDate">Returned date</FieldLabel>
              <FieldContent>
                <Input
                  type="date"
                  value={returnedDate}
                  onChange={(event) => setReturnedDate(event.target.value)}
                />
              </FieldContent>
            </Field>
          </div>
        </div>
        <div className="space-y-2 col-span-12">
          <Field>
            <FieldLabel htmlFor="reason">Reason</FieldLabel>
            <FieldContent>
              <Textarea
                id="reason"
                className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FieldContent>
          </Field>
        </div>
      </Card>
      <LineItemsEditor
        storeId={storeId}
        value={items}
        onChange={setItems}
        calculateMaxQty="in-return"
        initialDocumentQtyByQuotation={initialReturnQtyByQuotation}
      />
    </SimplePage>
  );
}
