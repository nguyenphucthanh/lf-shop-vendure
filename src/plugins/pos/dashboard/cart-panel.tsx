import { useLocalFormat } from "@vendure/dashboard";
import { MinusIcon, PlusIcon, TagIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";

import type { PosOrder, PosOrderLine } from "./hooks/use-pos-order";

interface Props {
  order: PosOrder | null;
  loading: boolean;
  error: string | null;
  onAdjustLine: (lineId: string, qty: number) => void;
  onRemoveLine: (lineId: string) => void;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: (code: string) => void;
  onCheckout: () => void;
  onClearError: () => void;
}

export function CartPanel({
  order,
  loading,
  error,
  onAdjustLine,
  onRemoveLine,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
  onClearError,
}: Props) {
  const { formatCurrency } = useLocalFormat();
  const [couponInput, setCouponInput] = useState("");
  const currencyCode = order?.currencyCode ?? "USD";
  const formatMoney = (amount: number) => formatCurrency(amount, currencyCode);

  const isEmpty = !order || order.lines.length === 0;
  const totalItems = order?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
  const discount =
    order?.discounts.reduce((sum, d) => sum + d.amountWithTax, 0) ?? 0;

  function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    onApplyCoupon(code);
    setCouponInput("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-foreground font-semibold">
          Cart{totalItems > 0 ? ` (${totalItems})` : ""}
        </h2>
        {loading && (
          <span className="text-muted-foreground text-xs">Updating…</span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 text-destructive flex items-start gap-2 px-4 py-2 text-sm">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={onClearError} aria-label="Dismiss error">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Lines */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="text-muted-foreground flex h-full items-center justify-center py-12 text-sm">
            Cart is empty
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {order.lines.map((line) => (
              <CartLineItem
                key={line.id}
                line={line}
                formatCurrency={formatMoney}
                onAdjust={(qty) => onAdjustLine(line.id, qty)}
                onRemove={() => onRemoveLine(line.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {!isEmpty && (
        <div className="border-border space-y-3 border-t px-4 py-3">
          {/* Coupon input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <TagIcon className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border py-1.5 pr-2 pl-8 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={!couponInput.trim() || loading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              Apply
            </button>
          </div>

          {/* Applied coupons */}
          {order.couponCodes.map((code) => (
            <div
              key={code}
              className="bg-primary/10 text-primary flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
            >
              <TagIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 font-medium">{code}</span>
              <button
                type="button"
                onClick={() => onRemoveCoupon(code)}
                aria-label={`Remove coupon ${code}`}
                className="opacity-70 hover:opacity-100"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Applied promotions */}
          {order.promotions.map((p) => (
            <div
              key={p.id}
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              <TagIcon className="h-3 w-3 shrink-0" />
              {p.name}
            </div>
          ))}

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="text-muted-foreground flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(order.subTotalWithTax)}</span>
            </div>
            {discount < 0 && (
              <div className="text-primary flex justify-between">
                <span>Discount</span>
                <span>{formatMoney(discount)}</span>
              </div>
            )}
            <div className="text-foreground flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(order.totalWithTax)}</span>
            </div>
          </div>

          {/* Checkout button */}
          <button
            type="button"
            onClick={onCheckout}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Checkout →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Cart Line Item ───────────────────────────────────────────────────────────

interface LineItemProps {
  line: PosOrderLine;
  formatCurrency: (amount: number) => string;
  onAdjust: (qty: number) => void;
  onRemove: () => void;
}

function CartLineItem({
  line,
  formatCurrency,
  onAdjust,
  onRemove,
}: LineItemProps) {
  const hasDiscount = line.discountedLinePriceWithTax < line.linePriceWithTax;
  const imageUrl =
    line.productVariant.featuredAsset?.preview ??
    line.productVariant.product.featuredAsset?.preview;

  return (
    <li className="flex gap-3 px-4 py-3">
      {/* Thumbnail */}
      <div className="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded-md">
        {imageUrl ? (
          <img
            src={`${imageUrl}?w=96&h=96&mode=crop`}
            alt={line.productVariant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg">
            📦
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">
              {line.productVariant.product.name}
            </p>
            {line.productVariant.name !== line.productVariant.product.name && (
              <p className="text-muted-foreground truncate text-xs">
                {line.productVariant.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove item"
            className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Qty controls */}
          <div className="border-border flex items-center gap-1 rounded-lg border">
            <button
              type="button"
              onClick={() => onAdjust(line.quantity - 1)}
              aria-label="Decrease quantity"
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center transition-colors"
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="text-foreground w-5 text-center text-sm font-medium">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onAdjust(line.quantity + 1)}
              aria-label="Increase quantity"
              className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center transition-colors"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            {hasDiscount && (
              <span className="text-muted-foreground mr-1 text-xs line-through">
                {formatCurrency(line.linePriceWithTax)}
              </span>
            )}
            <span
              className={[
                "text-sm font-semibold",
                hasDiscount ? "text-primary" : "text-foreground",
              ].join(" ")}
            >
              {formatCurrency(line.discountedLinePriceWithTax)}
            </span>
          </div>
        </div>

        {/* Line discounts */}
        {line.discounts.map((d, i) => (
          <p key={i} className="text-primary text-[11px]">
            🏷 {d.description}
          </p>
        ))}
      </div>
    </li>
  );
}
