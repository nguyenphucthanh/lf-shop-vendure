import { api, Button, Card, Input } from '@vendure/dashboard';
import { useEffect, useMemo, useState } from 'react';

import { graphql } from '@/gql';

import { LineItemsEditor, SimplePage, formatMoney, isoDate, toDateTimeInput, useStores } from './shared';

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

export function PaymentDetailPage({ route }: { route: any }) {
    const params = route.useParams();
    const isNew = params.id === 'new';
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const { stores } = useStores();

    const [storeId, setStoreId] = useState(search?.get('storeId') ?? '');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentPolicy, setPaymentPolicy] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentStatus, setPaymentStatus] = useState('Pending');
    const [discount, setDiscount] = useState('0');
    const [paidAmount, setPaidAmount] = useState('0');
    const [items, setItems] = useState<Array<{ quotationId: string; quantity: number }>>([]);
    const [saving, setSaving] = useState(false);

    const selectedStore = useMemo(() => stores.find(store => store.id === storeId), [stores, storeId]);

    useEffect(() => {
        if (isNew || !params.id) return;
        void api.query(GET_PAYMENT, { id: params.id }).then(result => {
            const payment = (result as any)?.consignmentPayment;
            if (!payment) return;
            setStoreId(payment.storeId);
            setPaymentDate(isoDate(payment.paymentDate));
            setPaymentPolicy(payment.paymentPolicy ?? '');
            setPaymentMethod(payment.paymentMethod ?? 'Cash');
            setPaymentStatus(payment.paymentStatus ?? 'Pending');
            setDiscount(String((payment.discount ?? 0) / 100));
            setPaidAmount(String((payment.paidAmount ?? 0) / 100));
            setItems((payment.items ?? []).map((item: any) => ({ quotationId: item.quotationId, quantity: item.quantity })));
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
                discount: Math.round(Number(discount || 0) * 100),
                paidAmount: Math.round(Number(paidAmount || 0) * 100),
                items,
            };
            if (isNew) {
                const result = await api.mutate(CREATE_PAYMENT, { input });
                const id = (result as any)?.createConsignmentPayment?.id;
                if (id) {
                    window.location.href = `/dashboard/consignment/payments/${id}`;
                }
            } else {
                await api.mutate(UPDATE_PAYMENT, { input: { id: params.id, ...input } });
                window.location.href = '/dashboard/consignment/payments';
            }
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (isNew) return;
        if (!window.confirm('Delete this payment?')) return;
        await api.mutate(DELETE_PAYMENT, { id: params.id });
        window.location.href = '/dashboard/consignment/payments';
    }

    return (
        <SimplePage
            title={isNew ? 'New Payment' : 'Edit Payment'}
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
                        <label className="text-sm font-medium">Consignment Store</label>
                        <div className="rounded-md border px-3 py-2 text-sm">
                            {selectedStore ? `${selectedStore.name}${selectedStore.emailAddress ? ` (${selectedStore.emailAddress})` : ''}` : (storeId ? `Store #${storeId}` : 'Not selected')}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment date</label>
                        <Input type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment policy</label>
                        <Input value={paymentPolicy} onChange={event => setPaymentPolicy(event.target.value)} placeholder="COD, Pay later" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment method</label>
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
                            <option value="Cash">Cash</option>
                            <option value="Bank transfer">Bank transfer</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment status</label>
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={paymentStatus} onChange={event => setPaymentStatus(event.target.value)}>
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Discount</label>
                        <Input type="number" min={0} step="0.01" value={discount} onChange={event => setDiscount(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Paid amount</label>
                        <Input type="number" min={0} step="0.01" value={paidAmount} onChange={event => setPaidAmount(event.target.value)} />
                    </div>
                </div>
                <div className="text-sm text-muted-foreground">Input amounts are entered in display currency and stored as money values.</div>
                <div className="text-sm text-muted-foreground">Current paid amount preview: {formatMoney(Math.round(Number(paidAmount || 0) * 100))}</div>
            </Card>
            <LineItemsEditor storeId={storeId} value={items} onChange={setItems} />
        </SimplePage>
    );
}
