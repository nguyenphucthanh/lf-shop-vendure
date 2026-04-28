import { api, Button, useNavigate } from "@vendure/dashboard";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { graphql } from "@/gql";

const CREATE_DRAFT_ORDER = graphql(`
  mutation CreateDraftOrder {
    createDraftOrder {
      id
    }
  }
`);

export function CreateOrderButton() {
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function handleClick() {
    setCreating(true);
    try {
      const result = await api.mutate(CREATE_DRAFT_ORDER, {});
      if (result?.createDraftOrder?.id) {
        navigate({
          to: `/orders/draft/${result.createDraftOrder.id}`,
        });
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      className="gap-1.5"
      disabled={creating}
      onClick={handleClick}
    >
      <PlusCircle className="h-4 w-4" />
      <span className="hidden sm:inline">
        {creating ? "Creating…" : "Create Draft Order"}
      </span>
    </Button>
  );
}
