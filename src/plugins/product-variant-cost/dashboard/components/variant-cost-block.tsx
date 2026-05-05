import {
  api,
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useChannel,
  useLocalFormat,
  PageContextValue,
  FieldLabel,
  Field,
  FieldContent,
} from "@vendure/dashboard";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";
import { CurrencyCode } from "@vendure/core";

const GET_VARIANT_COSTS = graphql(`
  query GetVariantCosts($variantId: ID!) {
    productVariantCosts(variantId: $variantId) {
      id
      currencyCode
      cost
      channelId
    }
  }
`);

const UPSERT_VARIANT_COST = graphql(`
  mutation UpsertVariantCost($input: UpsertProductVariantCostInput!) {
    upsertProductVariantCost(input: $input) {
      id
      currencyCode
      cost
      channelId
    }
  }
`);

const DELETE_VARIANT_COST = graphql(`
  mutation DeleteVariantCost($id: ID!) {
    deleteProductVariantCost(id: $id)
  }
`);

type VariantCost = {
  id: string;
  currencyCode: string;
  cost: number;
  channelId: string;
};

export function VariantCostBlock({ context }: { context: PageContextValue }) {
  const variantId = context.entity?.id as string | undefined;
  const { activeChannel } = useChannel();
  const { formatCurrency } = useLocalFormat();

  // Local form state
  const [editCost, setEditCost] = useState<string>("");
  const [editCurrency, setEditCurrency] = useState<string | null>(
    activeChannel?.defaultCurrencyCode ?? "USD",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [costs, setCosts] = useState<VariantCost[]>([]);
  
  useEffect(() => {
    if (!variantId) return;
    api.query(GET_VARIANT_COSTS, { variantId }).then((result) => {
      if (result?.productVariantCosts) {
        setCosts(result.productVariantCosts as VariantCost[]);
      }
    });
  }, [variantId]);

  const availableCurrencies: string[] =
    activeChannel?.availableCurrencyCodes ?? [
      activeChannel?.defaultCurrencyCode ?? "USD",
    ];

  async function handleSave() {
    if (!variantId || !editCost || !editCurrency) return;
    const costInMinorUnits = Math.round(parseFloat(editCost) * 100);
    if (isNaN(costInMinorUnits) || costInMinorUnits < 0) {
      toast("Invalid cost value");
      return;
    }
    setSaving(true);
    try {
      const result = await api.mutate(UPSERT_VARIANT_COST, {
        input: {
          variantId,
          channelId: activeChannel!.id,
          currencyCode: editCurrency as CurrencyCode,
          cost: costInMinorUnits,
        },
      });
      const updated = result?.upsertProductVariantCost as VariantCost | undefined;
      if (updated) {
        setCosts((prev) => {
          const existing = prev.findIndex((c) => c.id === updated.id);
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = updated;
            return next;
          }
          return [...prev, updated];
        });
        setEditCost("");
        toast("Cost saved");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.mutate(DELETE_VARIANT_COST, { id });
      setCosts((prev) => prev.filter((c) => c.id !== id));
      toast("Cost deleted");
    } finally {
      setDeleting(null);
    }
  }

  if (!variantId) return null;

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-sm font-semibold">Cost (per currency)</h3>

      {costs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.currencyCode}</TableCell>
                <TableCell>{formatCurrency(c.cost, c.currencyCode)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deleting === c.id}
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex gap-2 items-end">
        <div className="w-32">
          <Field>
            <FieldLabel>Currency</FieldLabel>
            <FieldContent>
              <Select value={editCurrency} onValueChange={setEditCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </div>
        <div className="flex-1">
          <Field>
            <FieldLabel>Cost</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={editCost}
                onChange={(e) => setEditCost(e.target.value)}
              />
            </FieldContent>
          </Field>
        </div>
        <Button onClick={handleSave} disabled={saving || !editCost}>
          {saving ? "Saving…" : "Save cost"}
        </Button>
      </div>
    </Card>
  );
}
