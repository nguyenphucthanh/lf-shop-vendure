import {
    api,
    Checkbox,
    Label,
    PageContextValue,
    toast,
} from '@vendure/dashboard';
import { useState } from 'react';

import { graphql } from '@/gql';

const SET_ORDER_CUSTOM_FIELDS = graphql(`
    mutation SetOrderDoNotUpdateStock($id: ID!, $doNotUpdateStock: Boolean!) {
        setOrderCustomFields(input: { id: $id, customFields: { doNotUpdateStock: $doNotUpdateStock } }) {
            id
        }
    }
`);

export function DoNotUpdateStockBlock({ context }: { context: PageContextValue }) {
    const order = context.entity;
    const orderId = order?.id as string | undefined;
    const isDraft = order?.state === 'Draft';
    const initialValue = (order?.customFields as any)?.doNotUpdateStock ?? false;
    const [checked, setChecked] = useState<boolean>(initialValue);
    const [saving, setSaving] = useState(false);

    if (!orderId) return null;

    async function handleChange(value: boolean) {
        setChecked(value);
        setSaving(true);
        try {
            await api.mutate(SET_ORDER_CUSTOM_FIELDS, {
                id: orderId!,
                doNotUpdateStock: value,
            });
            toast(value ? 'Stock will NOT be deducted for this order' : 'Stock will be deducted normally');
        } catch {
            setChecked(!value);
            toast('Failed to update setting');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id="do-not-update-stock"
                checked={checked}
                disabled={!isDraft || saving}
                onCheckedChange={(v) => handleChange(v === true)}
            />
            <Label
                htmlFor="do-not-update-stock"
                className={!isDraft ? 'text-muted-foreground' : ''}
            >
                Do not update stock
                {!isDraft && checked && (
                    <span className="ml-1 text-xs text-muted-foreground">(locked)</span>
                )}
            </Label>
        </div>
    );
}
