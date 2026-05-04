import {
  Card,
  Link,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vendure/dashboard";

import { EmptyState, SimplePage, StoreFilterCard } from "./shared";

type ConsignmentTabKey =
  | "quotations"
  | "intakes"
  | "payments"
  | "returns"
  | "report";

const TABS: Array<{ key: ConsignmentTabKey; title: string; path: string }> = [
  { key: "quotations", title: "Quotations", path: "/consignment/quotations" },
  { key: "intakes", title: "Intakes", path: "/consignment/intakes" },
  { key: "payments", title: "Payments", path: "/consignment/payments" },
  { key: "returns", title: "Returns", path: "/consignment/returns" },
  { key: "report", title: "Report", path: "/consignment/report" },
];

function normalizeStoreId(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const quotedMatch = trimmed.match(/^"(.*)"$/);
    return quotedMatch ? quotedMatch[1] : trimmed;
  }
  return "";
}

function toSearchStoreId(value: string): string | number | undefined {
  const normalized = normalizeStoreId(value);
  if (!normalized) {
    return undefined;
  }
  return /^\d+$/.test(normalized) ? Number(normalized) : normalized;
}

export function ConsignmentShell(props: {
  route: any;
  activeTab: ConsignmentTabKey;
  renderContent: (storeId: string) => React.ReactNode;
}) {
  const navigate = props.route.useNavigate();
  const search = (props.route.useSearch() ?? {}) as Record<string, unknown>;
  const storeId = normalizeStoreId(search.storeId);

  function handleStoreChange(nextStoreId: string) {
    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        storeId: toSearchStoreId(nextStoreId),
      }),
    });
  }

  return (
    <SimplePage title="Consignment">
      <StoreFilterCard storeId={storeId} onStoreChange={handleStoreChange} />

      {!storeId ? (
        <EmptyState
          title="Select a store"
          description="Choose a consignment store to continue."
        />
      ) : (
        <>
          <Tabs value={props.activeTab}>
            <TabsList>
              {TABS.map((tab) => {
                const isActive = tab.key === props.activeTab;
                return (
                  <TabsTrigger
                    value={tab.key}
                    key={tab.key}
                    render={(props) => (
                      <Link
                        key={tab.key}
                        to={`${tab.path}?storeId=${storeId}`}
                        {...props}
                      >
                        {tab.title}
                      </Link>
                    )}
                  ></TabsTrigger>
                );
              })}
            </TabsList>
            {props.renderContent(storeId)}
          </Tabs>
        </>
      )}
    </SimplePage>
  );
}
