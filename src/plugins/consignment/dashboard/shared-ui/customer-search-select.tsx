import {
  SingleRelationInput,
  createRelationSelectorConfig,
  graphql,
  ResultOf,
  DashboardFormComponentProps,
} from "@vendure/dashboard";
import { useRef } from "react";

// Define the GraphQL query for customers
const customerListQuery = graphql(`
  query GetCustomersForConsignment($options: CustomerListOptions) {
    customers(options: $options) {
      items {
        id
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

interface CustomerSearchSelectProps extends DashboardFormComponentProps {
  filterOptions?: CustomerSearchFilterOptions;
  placeholder?: string;
}

export function CustomerSearchSelect({
  value,
  onChange,
  disabled,
  filterOptions,
  placeholder = "Search customers...",
}: CustomerSearchSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Build search filter based on filterOptions
  const buildSearchFilter = (term: string) => {
    const filters: any[] = [];

    // Add search term filter
    if (term) {
      filters.push({
        or: [
          { emailAddress: { contains: term } },
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { title: { contains: term } },
        ],
      });
    }

    // Add consignment store filter if specified
    if (filterOptions?.isConsignment !== undefined) {
      filters.push({
        customFields: {
          consignmentStore: { eq: filterOptions.isConsignment },
        },
      });
    }

    // Return combined filters
    if (filters.length === 0) {
      return {};
    } else if (filters.length === 1) {
      return filters[0];
    } else {
      return { and: filters };
    }
  };

  // Create the configuration
  const customerConfig = createRelationSelectorConfig<
    ResultOf<typeof customerListQuery>["customers"]["items"][0]
  >({
    listQuery: customerListQuery as any,
    idKey: "id",
    labelKey: "emailAddress",
    placeholder,
    label: (customer) => (
      <div className="flex items-center justify-between py-1 w-full">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {customer.firstName} {customer.lastName}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {customer.emailAddress}
          </div>
        </div>
        {customer.customFields.externalId && (
          <div className="text-xs text-muted-foreground ml-2">
            {customer.customFields.externalId}
          </div>
        )}
      </div>
    ),
    buildSearchFilter,
  });

  return (
    <SingleRelationInput
      value={value}
      onChange={onChange}
      config={customerConfig}
      disabled={disabled}
      onBlur={() => {}}
      name={"select-customer"}
      ref={(r) => (ref.current = r)}
    />
  );
}
