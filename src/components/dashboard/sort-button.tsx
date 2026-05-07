import { Button } from "@vendure/dashboard";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";

export interface SortButtonProps<TSortKey extends string> {
  label: string;
  sortKey: TSortKey;
  current: TSortKey;
  dir: SortDirection;
  onSort: (key: TSortKey) => void;
}

export function SortButton<TSortKey extends string>({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: SortButtonProps<TSortKey>) {
  const active = current === sortKey;

  return (
    <Button
      variant="ghost"
      className="flex items-center gap-1 font-semibold px-0 h-auto"
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </Button>
  );
}
