import { Button, useNavigate } from "@vendure/dashboard";

function getEntityId(entity: unknown): string | null {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  const id = (entity as { id?: unknown }).id;
  if (typeof id === "number") {
    return String(id);
  }
  if (typeof id === "string") {
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

export function LoadDraftOrderInPosButton(props: {
  context: { entity?: unknown };
}) {
  const navigate = useNavigate();
  const orderId = getEntityId(props.context.entity);

  if (!orderId) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        navigate({
          to: "/pos",
          search: { orderId },
        })
      }
    >
      Load this order in POS
    </Button>
  );
}