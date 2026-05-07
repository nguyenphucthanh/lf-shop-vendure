import { Button, useLocalFormat, useNavigate } from "@vendure/dashboard";
import { ExternalLinkIcon, ShoppingCartIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { CartPanel } from "./cart-panel";
import { CheckoutSheet } from "./checkout-sheet";
import { CompletedOrderInfo, usePosOrder } from "./hooks/use-pos-order";
import { ProductGrid } from "./product-grid";
import { ReceiptScreen } from "./receipt-screen";

interface PosShellProps {
  requestedOrderId?: string;
}

export function PosShell({ requestedOrderId }: PosShellProps) {
  const {
    order,
    availablePromotions,
    loadingPromotions,
    loading,
    error,
    lineCount,
    clearError,
    addItem,
    adjustLine,
    removeLine,
    applyCoupon,
    removeCoupon,
    setCustomer,
    completeOrder,
    resetOrder,
  } = usePosOrder({ preferredOrderId: requestedOrderId });
  const navigate = useNavigate();

  const { formatCurrency } = useLocalFormat();
  const currencyCode = order?.currencyCode ?? "USD";
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [completedOrder, setCompletedOrder] =
    useState<CompletedOrderInfo | null>(null);

  // Cart quantity map for product grid badges
  const cartQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    for (const line of order?.lines ?? []) {
      quantities[line.productVariant.id] = line.quantity;
    }
    return quantities;
  }, [order?.lines]);

  async function handleComplete(
    paymentMethod: string,
    shippingMethodId: string,
    autoFulfillAndDeliver: boolean,
  ) {
    const result = await completeOrder(
      paymentMethod,
      shippingMethodId,
      autoFulfillAndDeliver,
    );
    if (result) {
      setCheckoutOpen(false);
      setMobileCartOpen(false);
      setCompletedOrder(result);
    }
  }

  function handleNewOrder() {
    resetOrder();
    setCompletedOrder(null);
  }

  // ─── Receipt screen ──────────────────────────────────────────────────────────
  if (completedOrder) {
    return (
      <div className="bg-background flex h-screen w-full items-center justify-center">
        <ReceiptScreen
          orderId={completedOrder.id}
          orderCode={completedOrder.code}
          onNewOrder={handleNewOrder}
        />
      </div>
    );
  }

  return (
    <div className="bg-background flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 z-10 flex h-12 shrink-0 items-center justify-between border-b px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-foreground text-base font-bold tracking-tight">
            POS
          </h1>
          {order?.id && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => navigate({ to: `/orders/draft/${order.id}` })}
              className="h-auto p-0 text-sm"
            >
              Go to order details
              <ExternalLinkIcon className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Product grid — takes remaining width */}
        <main className="flex flex-1 flex-col overflow-hidden px-3 pt-3 pb-20 md:pb-3">
          <ProductGrid cartQuantities={cartQuantities} onAddItem={addItem} />
        </main>

        {/* Cart panel — hidden on mobile, fixed sidebar on md+ */}
        <aside className="border-border bg-background hidden w-80 shrink-0 border-l md:flex md:flex-col lg:w-96">
          <CartPanel
            order={order}
            availablePromotions={availablePromotions}
            loadingPromotions={loadingPromotions}
            loading={loading}
            error={error}
            onAdjustLine={adjustLine}
            onRemoveLine={removeLine}
            onApplyCoupon={applyCoupon}
            onRemoveCoupon={removeCoupon}
            onCheckout={() => setCheckoutOpen(true)}
            onClearError={clearError}
          />
        </aside>
      </div>

      {/* ── Mobile sticky cart bar ────────────────────────────────────────── */}
      {lineCount > 0 && (
        <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-20 border-t px-4 py-3 backdrop-blur md:hidden">
          <Button
            type="button"
            size="sm"
            onClick={() => setMobileCartOpen(true)}
            className="bg-primary text-primary-foreground flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold shadow-lg"
          >
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className="h-4 w-4" />
              <span>View cart</span>
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                {lineCount}
              </span>
            </div>
            <span>
              {formatCurrency(order?.totalWithTax ?? 0, currencyCode)}
            </span>
          </Button>
        </div>
      )}

      {/* ── Mobile cart bottom sheet ─────────────────────────────────────── */}
      {mobileCartOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileCartOpen(false)}
            aria-hidden="true"
          />
          <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t-2xl shadow-2xl md:hidden">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
            </div>
            <div className="flex-1 overflow-hidden">
              <CartPanel
                order={order}
                availablePromotions={availablePromotions}
                loadingPromotions={loadingPromotions}
                loading={loading}
                error={error}
                onAdjustLine={adjustLine}
                onRemoveLine={removeLine}
                onApplyCoupon={applyCoupon}
                onRemoveCoupon={removeCoupon}
                onCheckout={() => {
                  setMobileCartOpen(false);
                  setCheckoutOpen(true);
                }}
                onClearError={clearError}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Checkout sheet ────────────────────────────────────────────────── */}
      <CheckoutSheet
        open={checkoutOpen}
        order={order}
        loading={loading}
        error={error}
        onSetCustomer={setCustomer}
        onComplete={handleComplete}
        onClose={() => setCheckoutOpen(false)}
        onClearError={clearError}
      />
    </div>
  );
}
