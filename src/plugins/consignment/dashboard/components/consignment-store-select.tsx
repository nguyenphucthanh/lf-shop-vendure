import { api, useQuery } from '@vendure/dashboard';
import { graphql } from '@/gql';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@vendure/dashboard';

const GET_CONSIGNMENT_STORES = graphql(`
    query GetConsignmentStores {
        customers(options: { filter: { customFields: { externalId: { isNull: false } } } }) {
            items {
                id
                firstName
                lastName
                customFields
            }
            totalItems
        }
    }
`);

interface Props {
    value: string;
    onChange: (storeId: string) => void;
    placeholder?: string;
}

export function ConsignmentStoreSelect({ value, onChange, placeholder = 'Select store...' }: Props) {
    const { data } = useQuery(GET_CONSIGNMENT_STORES);
    const stores = data?.customers?.items ?? [];

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-64">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                        {(s.customFields as any)?.externalId ? ` (${(s.customFields as any).externalId})` : ''}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
