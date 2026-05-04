import {
  api,
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  graphql,
} from "@vendure/dashboard";
import { useEffect, useState } from "react";

// Define the GraphQL query for customers
const customerListQuery = graphql(`
  query GetCustomersForConsignment($options: CustomerListOptions) {
    customers(options: $options) {
      items {
        id
        title
        firstName
        lastName
        emailAddress
        customFields {
          externalId
          consignmentStore
        }
      }
      totalItems
    }
  }
`);

export interface CustomerSearchFilterOptions {
  isConsignment?: boolean;
}

interface CustomerSearchSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  filterOptions?: CustomerSearchFilterOptions;
  placeholder?: string;
  take?: number;
  debounceMs?: number;
}

type CustomerItem = {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  emailAddress: string;
  customFields?: {
    externalId?: string | null;
    consignmentStore?: boolean | null;
  };
};

function buildDisplayName(customer: CustomerItem): string {
  return [customer.title, customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function toCaseInsensitiveContainsRegex(term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `(?i).*${escaped}.*`;
}

export function CustomerSearchSelect({
  value,
  onChange,
  disabled,
  filterOptions,
  placeholder = "Search customers...",
  take = 20,
  debounceMs = 250,
}: CustomerSearchSelectProps) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CustomerItem[]>([]);
  const [selected, setSelected] = useState<CustomerItem | null>(null);

  const buildFilter = (searchTerm: string) => {
    const filters: any[] = [];
    const normalizedTerm = searchTerm.trim();
    const isConsignmentFilter = filterOptions?.isConsignment ?? true;

    if (normalizedTerm) {
      const regex = toCaseInsensitiveContainsRegex(normalizedTerm);
      filters.push({
        _or: [
          { emailAddress: { regex } },
          { firstName: { regex } },
          { lastName: { regex } },
          { title: { regex } },
        ],
      });
    }

    filters.push({
      consignmentStore: { eq: isConsignmentFilter },
    });

    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0];
    return { _and: filters };
  };

  useEffect(() => {
    if (!value) {
      setSelected(null);
      setTerm("");
      return;
    }
    if (selected?.id === value) {
      return;
    }
    let active = true;
    void api
      .query(customerListQuery, {
        options: {
          take: 1,
          filter: {
            id: { eq: value },
          },
        },
      })
      .then((result) => {
        if (!active) return;
        const item = (result?.customers?.items?.[0] ??
          null) as CustomerItem | null;
        setSelected(item);
        if (item) {
          const fullName = buildDisplayName(item);
          setTerm(fullName || item.emailAddress);
        }
      });
    return () => {
      active = false;
    };
  }, [value, selected?.id]);

  useEffect(() => {
    const normalizedTerm = term.trim();
    if (disabled) {
      setOpen(false);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const timeout = setTimeout(() => {
      void api
        .query(customerListQuery, {
          options: {
            take,
            sort: { createdAt: "DESC" },
            filter: buildFilter(normalizedTerm),
          },
        })
        .then((result) => {
          if (!active) return;
          setOptions((result?.customers?.items ?? []) as CustomerItem[]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, debounceMs);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [term, disabled, filterOptions?.isConsignment, take, debounceMs]);

  return (
    <Combobox
      items={options}
      value={selected}
      open={open}
      disabled={disabled}
      inputValue={term}
      onOpenChange={setOpen}
      onInputValueChange={(inputValue) => setTerm(inputValue ?? "")}
      onValueChange={(nextValue) => {
        const customer = (nextValue ?? null) as CustomerItem | null;
        setSelected(customer);
        if (customer) {
          const fullName = buildDisplayName(customer);
          setTerm(fullName || customer.emailAddress);
          onChange(customer.id);
          setOpen(false);
        }
      }}
      itemToStringValue={(item) => item.id}
      itemToStringLabel={(item) => buildDisplayName(item) || item.emailAddress}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={!disabled}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxCollection>
            {(customer: CustomerItem) => (
              <ComboboxItem value={customer} key={customer.id}>
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {buildDisplayName(customer) || customer.emailAddress}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {customer.emailAddress}
                    </div>
                  </div>
                  {customer.customFields?.externalId ? (
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {customer.customFields.externalId}
                    </div>
                  ) : null}
                </div>
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
        <ComboboxEmpty>
          {loading ? "Searching..." : "No customers found."}
        </ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
