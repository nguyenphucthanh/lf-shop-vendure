import { api, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vendure/dashboard';
import { useEffect, useState } from 'react';

import { graphql } from '@/gql';

import { EmptyState, formatMoney, SimplePage, StoreFilterCard, useStores } from './shared';

const LIST_PAYMENTS = graphql(`
    query ConsignmentPaymentList($storeId: ID!) {
        consignmentPayments(storeId: $storeId) {
            id
            paymentDate
            paymentMethod
            paymentStatus
            total
            paidAmount
            remainingAmount
            items {
                id
                quantity
            }
        }
    }
`);

export function PaymentListPage() {
    const { stores } = useStores();
    const [storeId, setStoreId] = useState('');
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        if (!storeId) {
            setRows([]);
            return;
        }
        void api.query(LIST_PAYMENTS, { storeId }).then(result => {
            setRows(((result as any)?.consignmentPayments ?? []) as any[]);
        });
    }, [storeId]);

    return (
        <SimplePage
            title="Consignment Payments"
            actions={<Button disabled={!storeId} onClick={() => (window.location.href = `/dashboard/consignment/payments/new?storeId=${storeId}`)}>New payment</Button>}
        >
            <StoreFilterCard storeId={storeId} onStoreChange={setStoreId} stores={stores} />
            {!storeId ? (
                <EmptyState title="Select a store" description="Choose a consignment store to view payment records." />
            ) : (
                <Card className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead className="w-[140px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>{String(row.paymentDate).slice(0, 10)}</TableCell>
                                    <TableCell>{row.paymentMethod}</TableCell>
                                    <TableCell>{row.paymentStatus}</TableCell>
                                    <TableCell>{formatMoney(row.total)}</TableCell>
                                    <TableCell>{formatMoney(row.remainingAmount)}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="secondary" onClick={() => (window.location.href = `/dashboard/consignment/payments/${row.id}`)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No payment records found.</TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </SimplePage>
    );
}
