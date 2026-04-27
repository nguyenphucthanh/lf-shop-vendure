import { api, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vendure/dashboard';
import { useEffect, useState } from 'react';

import { graphql } from '@/gql';

import { EmptyState, formatMoney, SimplePage, StoreFilterCard } from './shared';

const LIST_QUOTATIONS = graphql(`
    query ConsignmentQuotationList($storeId: ID!) {
        consignmentQuotations(storeId: $storeId) {
            id
            createdAt
            productVariantName
            productVariantSku
            consignmentPrice
            note
        }
    }
`);

export function QuotationListPage() {
    const [storeId, setStoreId] = useState('');
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        if (!storeId) {
            setRows([]);
            return;
        }
        void api.query(LIST_QUOTATIONS, { storeId }).then(result => {
            setRows(result?.consignmentQuotations ?? []);
        });
    }, [storeId]);

    return (
        <SimplePage
            title="Consignment Quotations"
            actions={
                <Button disabled={!storeId} onClick={() => (window.location.href = `/dashboard/consignment/quotations/new?storeId=${storeId}`)}>
                    New quotation
                </Button>
            }
        >
            <StoreFilterCard storeId={storeId} onStoreChange={setStoreId} />
            {!storeId ? (
                <EmptyState title="Select a store" description="Choose a consignment store to view quotations." />
            ) : (
                <Card className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Consignment Price</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead className="w-[140px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.productVariantSku}</TableCell>
                                    <TableCell>{row.productVariantName}</TableCell>
                                    <TableCell>{formatMoney(row.consignmentPrice)}</TableCell>
                                    <TableCell>{row.note ?? '—'}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="secondary" onClick={() => (window.location.href = `/dashboard/consignment/quotations/${row.id}`)}>
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                                        No quotations found for this store.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </SimplePage>
    );
}
