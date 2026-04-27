import { api, Button, Card, Input } from '@vendure/dashboard';
import { useEffect, useState } from 'react';

import { graphql } from '@/gql';

import { LineItemsEditor, SimplePage, StoreSelect, isoDate, toDateTimeInput, useStores } from './shared';

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

export function ReturnDetailPage({ route }: { route: any }) {
    const params = route.useParams();
    const isNew = params.id === 'new';
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const { stores } = useStores();

    const [storeId, setStoreId] = useState(search?.get('storeId') ?? '');
    const [returnedDate, setReturnedDate] = useState(new Date().toISOString().slice(0, 10));
    const [reason, setReason] = useState('');
    const [items, setItems] = useState<Array<{ quotationId: string; quantity: number }>>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isNew || !params.id) return;
        void api.query(GET_RETURN, { id: params.id }).then(result => {
            const ret = (result as any)?.consignmentReturn;
            if (!ret) return;
            setStoreId(ret.storeId);
            setReturnedDate(isoDate(ret.returnedDate));
            setReason(ret.reason ?? '');
            setItems((ret.items ?? []).map((item: any) => ({ quotationId: item.quotationId, quantity: item.quantity })));
        });
    }, [isNew, params.id]);

    async function save() {
        setSaving(true);
        try {
            const input = {
                storeId,
                returnedDate: toDateTimeInput(returnedDate),
                reason: reason || null,
                items,
            };
            if (isNew) {
                const result = await api.mutate(CREATE_RETURN, { input });
                const id = (result as any)?.createConsignmentReturn?.id;
                if (id) {
                    window.location.href = `/dashboard/consignment/returns/${id}`;
                }
            } else {
                await api.mutate(UPDATE_RETURN, { input: { id: params.id, ...input } });
                window.location.href = '/dashboard/consignment/returns';
            }
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (isNew) return;
        if (!window.confirm('Delete this return?')) return;
        await api.mutate(DELETE_RETURN, { id: params.id });
        window.location.href = '/dashboard/consignment/returns';
    }

    return (
        <SimplePage
            title={isNew ? 'New Return' : 'Edit Return'}
            actions={
                <>
                    {!isNew ? <Button variant="ghost" onClick={remove}>Delete</Button> : null}
                    <Button onClick={save} disabled={saving || !storeId || items.length === 0}>{saving ? 'Saving…' : 'Save'}</Button>
                </>
            }
        >
            <Card className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Store</label>
                        <StoreSelect value={storeId} onChange={setStoreId} stores={stores} disabled={!isNew} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Returned date</label>
                        <Input type="date" value={returnedDate} onChange={event => setReturnedDate(event.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Reason</label>
                    <textarea className="min-h-[100px] w-full rounded-md border px-3 py-2 text-sm" value={reason} onChange={event => setReason(event.target.value)} />
                </div>
            </Card>
            <LineItemsEditor storeId={storeId} value={items} onChange={setItems} />
        </SimplePage>
    );
}
