import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  MailIcon,
  PrinterIcon,
  PlusCircleIcon,
} from "lucide-react";
import { Button, useNavigate } from "@vendure/dashboard";

interface Props {
  orderId: string;
  orderCode: string;
  onNewOrder: () => void;
}

export function ReceiptScreen({ orderId, orderCode, onNewOrder }: Props) {
  const navigate = useNavigate();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      {/* Success icon */}
      <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
        <CheckCircle2Icon className="text-primary h-10 w-10" />
      </div>

      {/* Message */}
      <div className="space-y-1">
        <h2 className="text-foreground text-2xl font-bold">Order Complete</h2>
        <p className="text-muted-foreground text-sm">
          Order{" "}
          <span className="text-foreground font-semibold">#{orderCode}</span>{" "}
          has been created and payment recorded.
        </p>
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: `/orders/${orderId}` })}
          className="border-border text-foreground hover:bg-muted flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          View order details
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="border-border text-foreground hover:bg-muted flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors"
        >
          <PrinterIcon className="h-4 w-4" />
          Print receipt
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            // Email action — intentionally left for caller to handle
            alert("Email receipt action — connect to your email service.");
          }}
          className="border-border text-foreground hover:bg-muted flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors"
        >
          <MailIcon className="h-4 w-4" />
          Email receipt
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onNewOrder}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors"
        >
          <PlusCircleIcon className="h-4 w-4" />
          Start new order
        </Button>
      </div>
    </div>
  );
}
