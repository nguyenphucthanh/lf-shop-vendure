import { api, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vendure/dashboard';
import { useEffect, useState } from 'react';

import { graphql } from '@/gql';

import { EmptyState, formatMoney, SimplePage, StoreFilterCard, useStores } from './shared';

const LIST_INTAKES = graphql(`
    query ConsignmentIntakeList($storeId: ID!) {
        consignmentIntakes(storeId: $storeId) {
            id
            intakeDate
            paymentPolicy
            deliveryMethod
            deliveryTrackingCode
            deliveryCost
            total
            items {
                id
                quantity
            }
        }
    }
`);

export function IntakeListPage() {
    const { stores } = useStores();
    const [storeId, setStoreId] = useState('');
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        if (!storeId) {
            setRows([]);
            return;
        }
        void api.query(LIST_INTAKES, { storeId }).then(result => {
            setRows(((result as any)?.consignmentIntakes ?? []) as any[]);
        });
    }, [storeId]);

    return (
        <SimplePage
            title="Consignment Intakes"
            actions={<Button disabled={!storeId} onClick={() => (window.location.href = `/dashboard/consignment/intakes/new?storeId=${storeId}`)}>New intake</Button>}
        >
            <StoreFilterCard storeId={storeId} onStoreChange={setStoreId} stores={stores} />
            {!storeId ? (
                <EmptyState title="Select a store" description="Choose a consignment store to view intake records." />
            ) : (
                <Card className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Delivery</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="w-[140px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>{String(row.intakeDate).slice(0, 10)}</TableCell>
                                    <TableCell>{row.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ?? 0}</TableCell>
                                    <TableCell>{formatMoney(row.deliveryCost)}</TableCell>
                                    <TableCell>{formatMoney(row.total)}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="secondary" onClick={() => (window.location.href = `/dashboard/consignment/intakes/${row.id}`)}>
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No intake records found.</TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </SimplePage>
    );
}
