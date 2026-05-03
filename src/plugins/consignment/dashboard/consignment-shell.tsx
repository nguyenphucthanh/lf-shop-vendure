import { Card, Link } from "@vendure/dashboard";

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
          <Card className="p-1">
            <div className="flex flex-wrap gap-1">
              {TABS.map((tab) => {
                const isActive = tab.key === props.activeTab;
                return (
                  <Link
                    key={tab.key}
                    to={`${tab.path}?storeId=${storeId}`}
                    className={`rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {tab.title}
                  </Link>
                );
              })}
            </div>
          </Card>
          {props.renderContent(storeId)}
        </>
      )}
    </SimplePage>
  );
}
