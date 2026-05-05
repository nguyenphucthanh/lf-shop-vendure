import { api, Button, Input, useLocalFormat } from "@vendure/dashboard";
import { ChevronLeftIcon, UserIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { graphql } from "@/gql";
import type { PosOrder } from "./hooks/use-pos-order";
import type { PosPaymentMethod } from "./hooks/use-payment-methods";
import { usePaymentMethods } from "./hooks/use-payment-methods";

// ─── Customer search ──────────────────────────────────────────────────────────

const SEARCH_CUSTOMERS = graphql(`
  query PosSearchCustomers($term: String!) {
    customers(
      options: {
        filter: {
          _or: [
            { emailAddress: { contains: $term } }
            { firstName: { contains: $term } }
            { lastName: { contains: $term } }
          ]
        }
        take: 8
      }
    ) {
      items {
        id
        firstName
        lastName
        emailAddress
      }
    }
  }
`);

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
};

const ELIGIBLE_SHIPPING_METHODS = graphql(`
  query PosEligibleShippingMethods($orderId: ID!) {
    eligibleShippingMethodsForDraftOrder(orderId: $orderId) {
      id
      name
      description
      priceWithTax
    }
  }
`);

type ShippingMethodQuote = {
  id: string;
  name: string;
  description: string;
  priceWithTax: number;
};

type Step = "customer" | "payment" | "shipping";

interface Props {
  open: boolean;
  order: PosOrder | null;
  loading: boolean;
  error: string | null;
  onSetCustomer: (customerId: string) => void;
  onComplete: (paymentMethod: string, shippingMethodId: string) => void;
  onClose: () => void;
  onClearError: () => void;
}

export function CheckoutSheet({
  open,
  order,
  loading,
  error,
  onSetCustomer,
  onComplete,
  onClose,
  onClearError,
}: Props) {
  const [step, setStep] = useState<Step>("customer");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedMethod, setSelectedMethod] = useState<PosPaymentMethod | null>(
    null,
  );
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodQuote[]>(
    [],
  );
  const [loadingShippingMethods, setLoadingShippingMethods] = useState(false);
  const [selectedShippingMethod, setSelectedShippingMethod] =
    useState<ShippingMethodQuote | null>(null);
  const { methods: paymentMethods, loading: loadingMethods } =
    usePaymentMethods(open ? (order?.id ?? undefined) : undefined);

  // Reset when sheet opens
  useEffect(() => {
    if (open) {
      setStep("customer");
      setSelectedCustomer(null);
      setSelectedMethod(null);
      setShippingMethods([]);
      setSelectedShippingMethod(null);
      onClearError();
    }
  }, [open]);

  // Auto-select first payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0]);
    }
  }, [paymentMethods]);

  useEffect(() => {
    if (!open || !order?.id) {
      setShippingMethods([]);
      return;
    }
    setLoadingShippingMethods(true);
    void api
      .query(ELIGIBLE_SHIPPING_METHODS, { orderId: order.id })
      .then((result) => {
        setShippingMethods(result?.eligibleShippingMethodsForDraftOrder ?? []);
      })
      .finally(() => setLoadingShippingMethods(false));
  }, [open, order?.id]);

  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedShippingMethod) {
      setSelectedShippingMethod(shippingMethods[0]);
    }
  }, [shippingMethods]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — full screen on mobile, slide-over on md+ */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "bg-background fixed z-50 flex flex-col shadow-xl",
          "inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px]",
          "transition-transform duration-300",
        ].join(" ")}
      >
        {/* Header */}
        <div className="border-border flex items-center gap-3 border-b px-4 py-3">
          {step !== "customer" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setStep(step === "shipping" ? "payment" : "customer")
              }
              aria-label="Go back"
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-foreground flex-1 font-semibold">
            {step === "customer"
              ? "Customer"
              : step === "payment"
                ? "Payment"
                : "Shipping"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close checkout"
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
          >
            <XIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Error */}
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

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {step === "customer" ? (
            <CustomerStep
              selectedCustomer={selectedCustomer}
              onSelect={(c) => {
                setSelectedCustomer(c);
                onSetCustomer(c.id);
              }}
              onClearSelection={() => setSelectedCustomer(null)}
              onSkip={() => setStep("payment")}
            />
          ) : step === "payment" ? (
            <PaymentStep
              order={order}
              methods={paymentMethods}
              loadingMethods={loadingMethods}
              selectedMethod={selectedMethod}
              onSelectMethod={setSelectedMethod}
            />
          ) : (
            <ShippingStep
              order={order}
              methods={shippingMethods}
              loadingMethods={loadingShippingMethods}
              selectedMethod={selectedShippingMethod}
              onSelectMethod={setSelectedShippingMethod}
            />
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-border border-t px-4 py-4">
          {step === "customer" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep("payment")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-3 text-sm font-semibold"
            >
              Continue to Payment →
            </Button>
          ) : step === "payment" ? (
            <Button
              type="button"
              size="sm"
              disabled={!selectedMethod}
              onClick={() => setStep("shipping")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
            >
              Continue to Shipping →
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!selectedMethod || !selectedShippingMethod || loading}
              onClick={() =>
                selectedMethod &&
                selectedShippingMethod &&
                onComplete(selectedMethod.code, selectedShippingMethod.id)
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Processing…" : "Complete Order →"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Customer Step ─────────────────────────────────────────────────────────────

interface CustomerStepProps {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer) => void;
  onClearSelection: () => void;
  onSkip: () => void;
}

function CustomerStep({
  selectedCustomer,
  onSelect,
  onClearSelection,
  onSkip,
}: CustomerStepProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      void api
        .query(SEARCH_CUSTOMERS, { term })
        .then((r) => setResults(r?.customers?.items ?? []))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term]);

  return (
    <div className="space-y-4">
      {selectedCustomer ? (
        <div className="border-primary bg-primary/5 flex items-center gap-3 rounded-xl border p-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
            <UserIcon className="text-primary h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-foreground font-medium">
              {selectedCustomer.firstName} {selectedCustomer.lastName}
            </p>
            <p className="text-muted-foreground text-sm">
              {selectedCustomer.emailAddress}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            aria-label="Clear selected customer"
            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Input
            type="search"
            placeholder="Search by name or email…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />

          {searching && (
            <p className="text-muted-foreground text-sm">Searching…</p>
          )}

          {results.length > 0 && (
            <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
              {results.map((c) => (
                <li key={c.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSelect(c)}
                    className="hover:bg-muted flex w-full items-center justify-start gap-3 px-3 py-2.5 text-left transition-colors"
                  >
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                      <UserIcon className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {c.emailAddress}
                      </p>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSkip}
        className="text-muted-foreground hover:text-foreground w-full py-1 text-sm underline"
      >
        Skip for now →
      </Button>
    </div>
  );
}

// ─── Payment Step ──────────────────────────────────────────────────────────────

interface PaymentStepProps {
  order: PosOrder | null;
  methods: PosPaymentMethod[];
  loadingMethods: boolean;
  selectedMethod: PosPaymentMethod | null;
  onSelectMethod: (method: PosPaymentMethod) => void;
}

function PaymentStep({
  order,
  methods,
  loadingMethods,
  selectedMethod,
  onSelectMethod,
}: PaymentStepProps) {
  const { formatCurrency } = useLocalFormat();
  const currencyCode = order?.currencyCode ?? "USD";

  return (
    <div className="space-y-4">
      {/* Order total */}
      {order && (
        <div className="bg-muted flex justify-between rounded-xl px-4 py-3 text-sm">
          <span className="text-muted-foreground">Amount due</span>
          <span className="text-foreground font-bold text-base">
            {formatCurrency(order.totalWithTax, currencyCode)}
          </span>
        </div>
      )}

      {/* Payment methods */}
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Payment method
        </p>
        {loadingMethods ? (
          <p className="text-muted-foreground text-sm">
            Loading payment methods…
          </p>
        ) : methods.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No payment methods available
          </p>
        ) : (
          methods.map((method) => {
            const selected = selectedMethod?.code === method.code;
            return (
              <Button
                key={method.code}
                type="button"
                variant="ghost"
                onClick={() => onSelectMethod(method)}
                className={[
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-4 w-4 items-center justify-start rounded-full border-2 shrink-0",
                    selected ? "border-primary" : "border-muted-foreground",
                  ].join(" ")}
                >
                  {selected && (
                    <div className="bg-primary h-2 w-2 rounded-full" />
                  )}
                </div>
                <div>
                  <p
                    className={[
                      "text-sm font-medium",
                      selected ? "text-primary" : "text-foreground",
                    ].join(" ")}
                  >
                    {method.name}
                  </p>
                  {method.description && (
                    <p className="text-muted-foreground text-xs">
                      {method.description}
                    </p>
                  )}
                </div>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}

interface ShippingStepProps {
  order: PosOrder | null;
  methods: ShippingMethodQuote[];
  loadingMethods: boolean;
  selectedMethod: ShippingMethodQuote | null;
  onSelectMethod: (method: ShippingMethodQuote) => void;
}

function ShippingStep({
  order,
  methods,
  loadingMethods,
  selectedMethod,
  onSelectMethod,
}: ShippingStepProps) {
  const { formatCurrency } = useLocalFormat();
  const currencyCode = order?.currencyCode ?? "USD";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Shipping method
        </p>
        {loadingMethods ? (
          <p className="text-muted-foreground text-sm">
            Loading shipping methods…
          </p>
        ) : methods.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No shipping methods available
          </p>
        ) : (
          methods.map((method) => {
            const selected = selectedMethod?.id === method.id;
            return (
              <Button
                key={method.id}
                type="button"
                variant="ghost"
                onClick={() => onSelectMethod(method)}
                className={[
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-4 w-4 items-center justify-start rounded-full border-2 shrink-0",
                    selected ? "border-primary" : "border-muted-foreground",
                  ].join(" ")}
                >
                  {selected && (
                    <div className="bg-primary h-2 w-2 rounded-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "text-sm font-medium",
                      selected ? "text-primary" : "text-foreground",
                    ].join(" ")}
                  >
                    {method.name}
                  </p>
                  {method.description && (
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {method.description}
                    </p>
                  )}
                </div>
                <span className="text-foreground text-sm font-semibold">
                  {formatCurrency(method.priceWithTax, currencyCode)}
                </span>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
