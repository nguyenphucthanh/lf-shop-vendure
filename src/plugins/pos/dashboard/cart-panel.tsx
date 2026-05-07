import {
  Button,
  Checkbox,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useLocalFormat,
} from "@vendure/dashboard";
import { MinusIcon, PlusIcon, TagIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  PosCouponPromotion,
  PosOrder,
  PosOrderLine,
} from "./hooks/use-pos-order";

interface Props {
  order: PosOrder | null;
  availablePromotions: PosCouponPromotion[];
  loadingPromotions: boolean;
  loading: boolean;
  error: string | null;
  onAdjustLine: (lineId: string, qty: number) => void;
  onRemoveLine: (lineId: string) => void;
  onApplyCoupon: (code: string) => Promise<void> | void;
  onRemoveCoupon: (code: string) => Promise<void> | void;
  onCheckout: () => void;
  onClearError: () => void;
}

export function CartPanel({
  order,
  availablePromotions,
  loadingPromotions,
  loading,
  error,
  onAdjustLine,
  onRemoveLine,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
  onClearError,
}: Props) {
  const LINE_ITEM_ACTION_CODE = "products_percentage_discount";
  const { formatCurrency } = useLocalFormat();
  const [promotionDrawerOpen, setPromotionDrawerOpen] = useState(false);
  const [promotionFilter, setPromotionFilter] = useState("");
  const [linePromotionDrawerOpen, setLinePromotionDrawerOpen] = useState(false);
  const [linePromotionFilter, setLinePromotionFilter] = useState("");
  const [activeDiscountLine, setActiveDiscountLine] =
    useState<PosOrderLine | null>(null);
  const currencyCode = order?.currencyCode ?? "USD";
  const formatMoney = (amount: number) => formatCurrency(amount, currencyCode);
  const lines = useMemo(() => order?.lines ?? [], [order]);
  const appliedCouponSet = useMemo(
    () => new Set(order?.couponCodes ?? []),
    [order?.couponCodes],
  );

  const isEmpty = useMemo(() => lines.length === 0, [lines]);
  const totalItems = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );
  const discount = useMemo(
    () => order?.discounts.reduce((sum, d) => sum + d.amountWithTax, 0) ?? 0,
    [order],
  );

  const filteredPromotions = useMemo(() => {
    const term = promotionFilter.trim().toLowerCase();
    if (!term) {
      return availablePromotions;
    }
    return availablePromotions.filter((promotion) => {
      const name = promotion.name.toLowerCase();
      const code = promotion.couponCode.toLowerCase();
      const description = promotion.description.toLowerCase();
      return (
        name.includes(term) || code.includes(term) || description.includes(term)
      );
    });
  }, [availablePromotions, promotionFilter]);

  const lineFilteredPromotions = useMemo(() => {
    if (!activeDiscountLine) {
      return [];
    }

    const productVariantId = activeDiscountLine.productVariant.id;
    const productId = activeDiscountLine.productVariant.product.id;
    const term = linePromotionFilter.trim().toLowerCase();

    return availablePromotions
      .filter((promotion) =>
        promotion.actions.some(
          (action) => action.code === LINE_ITEM_ACTION_CODE,
        ),
      )
      .filter((promotion) =>
        promotionTargetsVariant(promotion, productVariantId, productId),
      )
      .filter((promotion) => {
        if (!term) return true;
        return (
          promotion.name.toLowerCase().includes(term) ||
          promotion.couponCode.toLowerCase().includes(term) ||
          promotion.description.toLowerCase().includes(term)
        );
      });
  }, [
    activeDiscountLine,
    availablePromotions,
    linePromotionFilter,
    LINE_ITEM_ACTION_CODE,
  ]);

  function openLineDiscountDrawer(line: PosOrderLine) {
    setActiveDiscountLine(line);
    setLinePromotionFilter("");
    setLinePromotionDrawerOpen(true);
  }

  function closeLineDiscountDrawer(nextOpen: boolean) {
    setLinePromotionDrawerOpen(nextOpen);
    if (!nextOpen) {
      setActiveDiscountLine(null);
      setLinePromotionFilter("");
    }
  }

  async function handleTogglePromotion(code: string, checked: boolean) {
    if (loading) return;
    if (checked) {
      await onApplyCoupon(code);
    } else {
      await onRemoveCoupon(code);
    }
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearError}
            aria-label="Dismiss error"
            className="h-6 w-6 p-0"
          >
            <XIcon className="h-4 w-4" />
          </Button>
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
            {lines.map((line) => (
              <CartLineItem
                key={line.id}
                line={line}
                formatCurrency={formatMoney}
                onAdjust={(qty) => onAdjustLine(line.id, qty)}
                onOpenLineDiscount={() => openLineDiscountDrawer(line)}
                onRemove={() => onRemoveLine(line.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {!isEmpty && order && (
        <div className="border-border space-y-3 border-t px-4 py-3">
          {/* Promotion picker */}
          <Button
            type="button"
            size="sm"
            onClick={() => setPromotionDrawerOpen(true)}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full rounded-md px-3 py-1.5 text-sm font-medium"
          >
            <TagIcon className="mr-1 h-3.5 w-3.5" />
            Add promo
          </Button>

          {/* Applied coupons */}
          {order.couponCodes.map((code) => (
            <div
              key={code}
              className="bg-primary/10 text-primary flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
            >
              <TagIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 font-medium">{code}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveCoupon(code)}
                aria-label={`Remove coupon ${code}`}
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCheckout}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Checkout →
          </Button>
        </div>
      )}

      <Sheet open={promotionDrawerOpen} onOpenChange={setPromotionDrawerOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Promotions</SheetTitle>
            <SheetDescription>
              Pick one or more promotions to apply to this cart.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 py-4">
            <Input
              type="text"
              placeholder="Filter promotions"
              value={promotionFilter}
              onChange={(event) => setPromotionFilter(event.target.value)}
            />

            {loadingPromotions ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                Loading promotions…
              </div>
            ) : filteredPromotions.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No promotions found.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPromotions.map((promotion) => {
                  const isChecked = appliedCouponSet.has(promotion.couponCode);
                  return (
                    <label
                      key={promotion.id}
                      className="border-border hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          void handleTogglePromotion(
                            promotion.couponCode,
                            Boolean(checked),
                          )
                        }
                        disabled={loading}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {promotion.name}
                        </span>
                        <span className="text-primary block text-xs font-semibold">
                          {promotion.couponCode}
                        </span>
                        {promotion.description ? (
                          <span className="text-muted-foreground mt-1 block text-xs">
                            {promotion.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={linePromotionDrawerOpen}
        onOpenChange={closeLineDiscountDrawer}
      >
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Promotions</SheetTitle>
            <SheetDescription>
              {activeDiscountLine
                ? `Pick one or more line promotions for ${activeDiscountLine.productVariant.name}.`
                : "Pick one or more line promotions."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 py-4">
            <Input
              type="text"
              placeholder="Filter promotions"
              value={linePromotionFilter}
              onChange={(event) => setLinePromotionFilter(event.target.value)}
            />

            {loadingPromotions ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                Loading promotions…
              </div>
            ) : lineFilteredPromotions.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No line promotions found.
              </div>
            ) : (
              <div className="space-y-2">
                {lineFilteredPromotions.map((promotion) => {
                  const isChecked = appliedCouponSet.has(promotion.couponCode);
                  return (
                    <label
                      key={promotion.id}
                      className="border-border hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          void handleTogglePromotion(
                            promotion.couponCode,
                            Boolean(checked),
                          )
                        }
                        disabled={loading}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block truncate text-sm font-medium">
                          {promotion.name}
                        </span>
                        <span className="text-primary block text-xs font-semibold">
                          {promotion.couponCode}
                        </span>
                        {promotion.description ? (
                          <span className="text-muted-foreground mt-1 block text-xs">
                            {promotion.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function promotionTargetsVariant(
  promotion: PosCouponPromotion,
  productVariantId: string,
  productId: string,
): boolean {
  const allArgs = [...promotion.actions, ...promotion.conditions].flatMap(
    (entry) => entry.args,
  );

  return allArgs.some((arg) => {
    const value = arg.value;
    if (!value) return false;
    if (matchesIdToken(value, productVariantId)) return true;
    if (matchesIdToken(value, productId)) return true;
    return false;
  });
}

function matchesIdToken(rawValue: string, id: string): boolean {
  if (rawValue === id) {
    return true;
  }

  if (rawValue.includes(`"${id}"`)) {
    return true;
  }

  const tokens = rawValue
    .split(/[\s,|]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.includes(id);
}

// ─── Cart Line Item ───────────────────────────────────────────────────────────

interface LineItemProps {
  line: PosOrderLine;
  formatCurrency: (amount: number) => string;
  onAdjust: (qty: number) => void;
  onOpenLineDiscount: () => void;
  onRemove: () => void;
}

function CartLineItem({
  line,
  formatCurrency,
  onAdjust,
  onOpenLineDiscount,
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
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenLineDiscount}
              aria-label="Open line discount promotions"
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs transition-colors"
            >
              Discount
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              aria-label="Remove item"
              className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 transition-colors"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Qty controls */}
          <div className="border-border flex items-center gap-1 rounded-lg border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAdjust(line.quantity - 1)}
              aria-label="Decrease quantity"
              className="text-muted-foreground hover:text-foreground h-7 w-7 p-0 transition-colors"
            >
              <MinusIcon className="h-3 w-3" />
            </Button>
            <span className="text-foreground w-5 text-center text-sm font-medium">
              {line.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAdjust(line.quantity + 1)}
              aria-label="Increase quantity"
              className="text-muted-foreground hover:text-foreground h-7 w-7 p-0 transition-colors"
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
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
