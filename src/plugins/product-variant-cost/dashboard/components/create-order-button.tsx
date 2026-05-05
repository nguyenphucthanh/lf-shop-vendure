import { Button, useNavigate } from "@vendure/dashboard";
import { PlusCircle } from "lucide-react";

export function CreateOrderButton() {
  const navigate = useNavigate();

  function handleClick() {
    navigate({
      to: "/pos",
    });
  }

  return (
    <Button
      variant="default"
      size="sm"
      className="gap-1.5"
      onClick={handleClick}
    >
      <PlusCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Create Order (POS)</span>
    </Button>
  );
}
