import { api } from "@vendure/dashboard";
import { useCallback, useEffect, useRef, useState } from "react";

import { graphql } from "@/gql";

// ─── Queries & Mutations ─────────────────────────────────────────────────────

const GET_DRAFT_ORDER = graphql(`
  query PosDraftOrder($id: ID!) {
    order(id: $id) {
      id
      code
      state
      currencyCode
      totalWithTax
      subTotalWithTax
      discounts {
        adjustmentSource
        type
        description
        amount
        amountWithTax
      }
      couponCodes
      promotions {
        id
        name
      }
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        discountedLinePriceWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        productVariant {
          id
          name
          sku
          priceWithTax
          product {
            id
            name
            featuredAsset {
              preview
            }
          }
          featuredAsset {
            preview
          }
        }
      }
    }
  }
`);

const GET_LATEST_DRAFT_ORDER = graphql(`
  query PosLatestDraftOrder {
    orders(
      options: {
        take: 1
        sort: { updatedAt: DESC }
        filter: { state: { eq: "Draft" } }
      }
    ) {
      items {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
    }
  }
`);

const CREATE_DRAFT_ORDER = graphql(`
  mutation PosCreateDraftOrder {
    createDraftOrder {
      id
      code
      state
      currencyCode
      totalWithTax
      subTotalWithTax
      discounts {
        adjustmentSource
        type
        description
        amount
        amountWithTax
      }
      couponCodes
      promotions {
        id
        name
      }
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        discountedLinePriceWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        productVariant {
          id
          name
          sku
          priceWithTax
          product {
            id
            name
            featuredAsset {
              preview
            }
          }
          featuredAsset {
            preview
          }
        }
      }
    }
  }
`);

const ADD_ITEM = graphql(`
  mutation PosAddItem($orderId: ID!, $productVariantId: ID!, $quantity: Int!) {
    addItemToDraftOrder(
      orderId: $orderId
      input: { productVariantId: $productVariantId, quantity: $quantity }
    ) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const ADJUST_LINE = graphql(`
  mutation PosAdjustLine($orderId: ID!, $orderLineId: ID!, $quantity: Int!) {
    adjustDraftOrderLine(
      orderId: $orderId
      input: { orderLineId: $orderLineId, quantity: $quantity }
    ) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const REMOVE_LINE = graphql(`
  mutation PosRemoveLine($orderId: ID!, $orderLineId: ID!) {
    removeDraftOrderLine(orderId: $orderId, orderLineId: $orderLineId) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const APPLY_COUPON = graphql(`
  mutation PosApplyCoupon($orderId: ID!, $couponCode: String!) {
    applyCouponCodeToDraftOrder(orderId: $orderId, couponCode: $couponCode) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const REMOVE_COUPON = graphql(`
  mutation PosRemoveCoupon($orderId: ID!, $couponCode: String!) {
    removeCouponCodeFromDraftOrder(orderId: $orderId, couponCode: $couponCode) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
    }
  }
`);

const SET_CUSTOMER = graphql(`
  mutation PosSetCustomer($orderId: ID!, $customerId: ID!) {
    setCustomerForDraftOrder(orderId: $orderId, customerId: $customerId) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const SET_SHIPPING_METHOD = graphql(`
  mutation PosSetShippingMethod($orderId: ID!, $shippingMethodId: ID!) {
    setDraftOrderShippingMethod(
      orderId: $orderId
      shippingMethodId: $shippingMethodId
    ) {
      ... on Order {
        id
        code
        state
        currencyCode
        totalWithTax
        subTotalWithTax
        discounts {
          adjustmentSource
          type
          description
          amount
          amountWithTax
        }
        couponCodes
        promotions {
          id
          name
        }
        lines {
          id
          quantity
          unitPriceWithTax
          linePriceWithTax
          discountedLinePriceWithTax
          discounts {
            adjustmentSource
            type
            description
            amount
            amountWithTax
          }
          productVariant {
            id
            name
            sku
            priceWithTax
            product {
              id
              name
              featuredAsset {
                preview
              }
            }
            featuredAsset {
              preview
            }
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const TRANSITION_ORDER = graphql(`
  mutation PosTransitionOrder($id: ID!, $state: String!) {
    transitionOrderToState(id: $id, state: $state) {
      ... on Order {
        id
        state
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
      }
    }
  }
`);

const ADD_PAYMENT = graphql(`
  mutation PosAddPayment($orderId: ID!, $method: String!, $metadata: JSON!) {
    addManualPaymentToOrder(
      input: {
        orderId: $orderId
        method: $method
        transactionId: ""
        metadata: $metadata
      }
    ) {
      ... on Order {
        id
        code
        state
      }
      ... on ManualPaymentStateError {
        errorCode
        message
      }
    }
  }
`);

const GET_FULFILLMENT_HANDLERS = graphql(`
  query PosGetFulfillmentHandlers {
    fulfillmentHandlers {
      code
      args {
        name
        defaultValue
      }
    }
  }
`);

const GET_SHIPPING_METHOD_HANDLER = graphql(`
  query PosShippingMethodHandler($id: ID!) {
    shippingMethod(id: $id) {
      id
      fulfillmentHandlerCode
    }
  }
`);

const ADD_FULFILLMENT = graphql(`
  mutation PosAddFulfillment($input: FulfillOrderInput!) {
    addFulfillmentToOrder(input: $input) {
      ... on Fulfillment {
        id
        state
        nextStates
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

const TRANSITION_FULFILLMENT = graphql(`
  mutation PosTransitionFulfillment($id: ID!, $state: String!) {
    transitionFulfillmentToState(id: $id, state: $state) {
      ... on Fulfillment {
        id
        state
        nextStates
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PosDiscount {
  adjustmentSource: string;
  type: string;
  description: string;
  amount: number;
  amountWithTax: number;
}

export interface PosVariant {
  id: string;
  name: string;
  sku: string;
  priceWithTax: number;
  product: {
    id: string;
    name: string;
    featuredAsset: { preview: string } | null;
  };
  featuredAsset: { preview: string } | null;
}

export interface PosOrderLine {
  id: string;
  quantity: number;
  unitPriceWithTax: number;
  linePriceWithTax: number;
  discountedLinePriceWithTax: number;
  discounts: PosDiscount[];
  productVariant: PosVariant;
}

export interface PosOrder {
  __typename?: "Order";
  id: string;
  code: string;
  state: string;
  currencyCode: string;
  totalWithTax: number;
  subTotalWithTax: number;
  discounts: PosDiscount[];
  couponCodes: string[];
  promotions: Array<{ id: string; name: string }>;
  lines: PosOrderLine[];
}

export interface CompletedOrderInfo {
  id: string;
  code: string;
}

interface UsePosOrderOptions {
  preferredOrderId?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePosOrder(options: UsePosOrderOptions = {}) {
  const { preferredOrderId } = options;
  const [order, setOrder] = useState<PosOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderRef = useRef<PosOrder | null>(null);
  const initialLoadRef = useRef<Promise<void> | null>(null);
  // Serialize mutations so fast taps are queued instead of dropped.
  const runQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const setCurrentOrder = useCallback((nextOrder: PosOrder | null) => {
    orderRef.current = nextOrder;
    setOrder(nextOrder);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const ensureOrder = useCallback(async (): Promise<string> => {
    if (orderRef.current?.id) return orderRef.current.id;
    await initialLoadRef.current;
    if (orderRef.current?.id) return orderRef.current.id;

    const result = await api.mutate(CREATE_DRAFT_ORDER, {});
    const id = result?.createDraftOrder?.id;
    if (!id) throw new Error("Failed to create draft order");
    setCurrentOrder({
      id,
      code: result.createDraftOrder.code,
      state: result.createDraftOrder.state,
      currencyCode: result.createDraftOrder.currencyCode,
      totalWithTax: result.createDraftOrder.totalWithTax,
      subTotalWithTax: result.createDraftOrder.subTotalWithTax,
      discounts: result.createDraftOrder.discounts,
      couponCodes: result.createDraftOrder.couponCodes,
      promotions: result.createDraftOrder.promotions,
      lines: result.createDraftOrder.lines,
    });
    return id;
  }, [setCurrentOrder]);

  const applyOrderResult = useCallback(
    (result: Record<string, unknown> | null | undefined, key: string) => {
      const data = result?.[key];
      if (!data) return;
      if (
        typeof data === "object" &&
        "errorCode" in data &&
        typeof (data as { errorCode: unknown }).errorCode === "string"
      ) {
        const message =
          (data as { message?: unknown }).message ?? "Operation failed";
        setError(String(message));
        return;
      }
      setCurrentOrder(data as PosOrder);
    },
    [setCurrentOrder],
  );

  const extractMutationError = useCallback(
    (
      result: Record<string, unknown> | null | undefined,
      key: string,
    ): string | null => {
      const data = result?.[key];
      if (!data || typeof data !== "object") {
        return null;
      }
      if (
        "errorCode" in data &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
      ) {
        return String((data as { message?: unknown }).message);
      }
      return null;
    },
    [],
  );

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      const execute = async () => {
        setLoading(true);
        setError(null);
        try {
          return await fn();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          return undefined;
        } finally {
          setLoading(false);
        }
      };

      const scheduled = runQueueRef.current.then(execute, execute);
      runQueueRef.current = scheduled.then(
        () => undefined,
        () => undefined,
      );
      return scheduled;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const loadLatestDraftOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        let draftOrder: PosOrder | null = null;

        if (preferredOrderId) {
          const result = await api.query(GET_DRAFT_ORDER, {
            id: preferredOrderId,
          });
          if (cancelled) {
            return;
          }
          if (result?.order && result.order.state !== "Draft") {
            setError(
              `POS only supports draft orders. Loaded order is in state "${result.order.state}".`,
            );
            return;
          }
          if (result?.order?.state === "Draft") {
            draftOrder = result.order;
          }
        }

        if (!draftOrder) {
          const result = await api.query(GET_LATEST_DRAFT_ORDER, {});
          if (cancelled) {
            return;
          }
          draftOrder = result?.orders?.items?.[0] ?? null;
        }

        if (cancelled) {
          return;
        }
        if (draftOrder) {
          setCurrentOrder(draftOrder);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const loadPromise = loadLatestDraftOrder();
    initialLoadRef.current = loadPromise;
    void loadPromise.finally(() => {
      if (initialLoadRef.current === loadPromise) {
        initialLoadRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [preferredOrderId, setCurrentOrder]);

  const addItem = useCallback(
    async (productVariantId: string) => {
      await run(async () => {
        const orderId = await ensureOrder();
        const existing = order?.lines.find(
          (l) => l.productVariant.id === productVariantId,
        );
        if (existing) {
          const result = await api.mutate(ADJUST_LINE, {
            orderId,
            orderLineId: existing.id,
            quantity: existing.quantity + 1,
          });
          applyOrderResult(result, "adjustDraftOrderLine");
        } else {
          const result = await api.mutate(ADD_ITEM, {
            orderId,
            productVariantId,
            quantity: 1,
          });
          applyOrderResult(result, "addItemToDraftOrder");
        }
      });
    },
    [applyOrderResult, ensureOrder, order, run],
  );

  const adjustLine = useCallback(
    async (orderLineId: string, quantity: number) => {
      if (!order?.id) return;
      await run(async () => {
        if (quantity <= 0) {
          const result = await api.mutate(REMOVE_LINE, {
            orderId: order.id,
            orderLineId,
          });
          applyOrderResult(result, "removeDraftOrderLine");
        } else {
          const result = await api.mutate(ADJUST_LINE, {
            orderId: order.id,
            orderLineId,
            quantity,
          });
          applyOrderResult(result, "adjustDraftOrderLine");
        }
      });
    },
    [applyOrderResult, order, run],
  );

  const removeLine = useCallback(
    async (orderLineId: string) => {
      if (!order?.id) return;
      await run(async () => {
        const result = await api.mutate(REMOVE_LINE, {
          orderId: order.id,
          orderLineId,
        });
        applyOrderResult(result, "removeDraftOrderLine");
      });
    },
    [applyOrderResult, order, run],
  );

  const applyCoupon = useCallback(
    async (couponCode: string) => {
      if (!order?.id) return;
      await run(async () => {
        const result = await api.mutate(APPLY_COUPON, {
          orderId: order.id,
          couponCode,
        });
        applyOrderResult(result, "applyCouponCodeToDraftOrder");
      });
    },
    [applyOrderResult, order, run],
  );

  const removeCoupon = useCallback(
    async (couponCode: string) => {
      if (!order?.id) return;
      await run(async () => {
        const result = await api.mutate(REMOVE_COUPON, {
          orderId: order.id,
          couponCode,
        });
        applyOrderResult(result, "removeCouponCodeFromDraftOrder");
      });
    },
    [applyOrderResult, order, run],
  );

  const setCustomer = useCallback(
    async (customerId: string) => {
      if (!customerId.trim()) return;
      if (!order?.id) return;
      await run(async () => {
        const result = await api.mutate(SET_CUSTOMER, {
          orderId: order.id,
          customerId,
        });
        applyOrderResult(result, "setCustomerForDraftOrder");
      });
    },
    [applyOrderResult, order, run],
  );

  const completeOrder = useCallback(
    async (
      paymentMethod: string,
      shippingMethodId: string,
      autoFulfillAndDeliver = true,
    ): Promise<CompletedOrderInfo | null> => {
      if (!order?.id) return null;
      let completedOrder: CompletedOrderInfo | null = null;
      await run(async () => {
        // 1. Shipping method is required before leaving Draft state.
        const shippingResult = await api.mutate(SET_SHIPPING_METHOD, {
          orderId: order.id,
          shippingMethodId,
        });
        applyOrderResult(shippingResult, "setDraftOrderShippingMethod");
        const shippingError = extractMutationError(
          shippingResult,
          "setDraftOrderShippingMethod",
        );
        if (shippingError) {
          setError(shippingError);
          return;
        }

        // 2. Transition to ArrangingPayment
        const arrangingResult = await api.mutate(TRANSITION_ORDER, {
          id: order.id,
          state: "ArrangingPayment",
        });
        const arrangingError = extractMutationError(
          arrangingResult,
          "transitionOrderToState",
        );
        if (arrangingError) {
          setError(arrangingError);
          return;
        }

        // 3. Add manual payment
        const payResult = await api.mutate(ADD_PAYMENT, {
          orderId: order.id,
          method: paymentMethod,
          metadata: { source: "pos" },
        });
        const paid = payResult?.addManualPaymentToOrder;
        if (
          paid &&
          typeof paid === "object" &&
          "code" in paid &&
          "id" in paid &&
          typeof (paid as { code: string }).code === "string" &&
          typeof (paid as { id: string }).id === "string"
        ) {
          completedOrder = {
            id: (paid as { id: string }).id,
            code: (paid as { code: string }).code,
          };
        } else if (paid && typeof paid === "object" && "errorCode" in paid) {
          setError((paid as { message: string }).message);
          return;
        }

        const paidOrderState =
          paid && typeof paid === "object" && "state" in paid
            ? String((paid as { state: unknown }).state)
            : null;

        // 4. Transition to PaymentSettled only if payment did not already do it.
        if (paidOrderState !== "PaymentSettled") {
          const settledResult = await api.mutate(TRANSITION_ORDER, {
            id: order.id,
            state: "PaymentSettled",
          });
          const settledError = extractMutationError(
            settledResult,
            "transitionOrderToState",
          );
          if (settledError) {
            setError(settledError);
            return;
          }
        }

        if (!autoFulfillAndDeliver) {
          return;
        }

        const linesToFulfill =
          orderRef.current?.lines
            .filter((line) => line.quantity > 0)
            .map((line) => ({
              orderLineId: line.id,
              quantity: line.quantity,
            })) ?? [];

        if (linesToFulfill.length === 0) {
          return;
        }

        const handlersResult = await api.query(GET_FULFILLMENT_HANDLERS, {});
        const shippingMethodResult = await api.query(
          GET_SHIPPING_METHOD_HANDLER,
          {
            id: shippingMethodId,
          },
        );
        const handlerCode =
          shippingMethodResult?.shippingMethod?.fulfillmentHandlerCode;
        if (!handlerCode) {
          setError("Selected shipping method has no fulfillment handler");
          return;
        }

        const handlerDefinition = handlersResult?.fulfillmentHandlers?.find(
          (handler) => handler.code === handlerCode,
        );

        if (!handlerDefinition) {
          setError(`Fulfillment handler "${handlerCode}" is not available`);
          return;
        }

        const fulfillmentResult = await api.mutate(ADD_FULFILLMENT, {
          input: {
            lines: linesToFulfill,
            handler: {
              code: handlerCode,
              arguments: handlerDefinition.args.map((arg) => ({
                name: arg.name,
                value: arg.defaultValue ?? "",
              })),
            },
          },
        });
        const fulfillmentError = extractMutationError(
          fulfillmentResult,
          "addFulfillmentToOrder",
        );
        if (fulfillmentError) {
          setError(fulfillmentError);
          return;
        }

        const createdFulfillment = fulfillmentResult?.addFulfillmentToOrder;
        if (
          !createdFulfillment ||
          typeof createdFulfillment !== "object" ||
          !("id" in createdFulfillment) ||
          !("state" in createdFulfillment)
        ) {
          setError("Failed to create fulfillment");
          return;
        }

        let fulfillmentId = String((createdFulfillment as { id: unknown }).id);
        let fulfillmentState = String(
          (createdFulfillment as { state: unknown }).state,
        );
        let nextStates = Array.isArray(
          (createdFulfillment as { nextStates?: unknown }).nextStates,
        )
          ? ((createdFulfillment as { nextStates: string[] }).nextStates ?? [])
          : [];

        // Transition fulfillment through available states until Delivered.
        for (let i = 0; i < 8 && fulfillmentState !== "Delivered"; i++) {
          if (nextStates.length === 0) {
            break;
          }
          const targetState = nextStates.includes("Delivered")
            ? "Delivered"
            : nextStates.includes("Shipped")
              ? "Shipped"
              : nextStates[0];

          const transitionResult = await api.mutate(TRANSITION_FULFILLMENT, {
            id: fulfillmentId,
            state: targetState,
          });
          const transitionError = extractMutationError(
            transitionResult,
            "transitionFulfillmentToState",
          );
          if (transitionError) {
            setError(transitionError);
            return;
          }

          const transitioned = transitionResult?.transitionFulfillmentToState;
          if (
            !transitioned ||
            typeof transitioned !== "object" ||
            !("id" in transitioned) ||
            !("state" in transitioned)
          ) {
            setError("Failed to transition fulfillment state");
            return;
          }

          fulfillmentId = String((transitioned as { id: unknown }).id);
          fulfillmentState = String((transitioned as { state: unknown }).state);
          nextStates = Array.isArray(
            (transitioned as { nextStates?: unknown }).nextStates,
          )
            ? ((transitioned as { nextStates: string[] }).nextStates ?? [])
            : [];
        }

        if (fulfillmentState !== "Delivered") {
          setError("Could not transition fulfillment to Delivered");
          return;
        }
      });
      return completedOrder;
    },
    [applyOrderResult, extractMutationError, order, run],
  );

  const resetOrder = useCallback(() => {
    setCurrentOrder(null);
    setError(null);
  }, [setCurrentOrder]);

  const lineCount = order?.lines.reduce((sum, l) => sum + l.quantity, 0) ?? 0;

  return {
    order,
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
    hasExplicitPreferredOrder: !!preferredOrderId,
  };
}
