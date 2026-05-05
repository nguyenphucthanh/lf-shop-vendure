import { type AnyRoute, defineDashboardExtension } from "@vendure/dashboard";
import { ShoppingBagIcon } from "lucide-react";

import { LoadDraftOrderInPosButton } from "./load-draft-order-in-pos-button";
import { PosShell } from "./pos-shell";

function normalizeOrderId(value: unknown): string | undefined {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function PosRoute(props: { route: AnyRoute }) {
  const search = props.route.useSearch();

  return <PosShell requestedOrderId={normalizeOrderId(search?.orderId)} />;
}

defineDashboardExtension({
  navSections: [
    {
      id: "pos",
      title: "POS",
      icon: ShoppingBagIcon,
      placement: "top",
      order: 1,
    },
  ],
  routes: [
    {
      path: "/pos",
      component: (route) => <PosRoute route={route} />,
      navMenuItem: {
        sectionId: "pos",
        id: "pos",
        title: "Point of Sale",
        order: 100,
      },
    },
  ],
  actionBarItems: [
    {
      id: "load-in-pos-button",
      pageId: "draft-order-detail",
      component: LoadDraftOrderInPosButton,
      position: {
        itemId: "complete-draft-button",
        order: "before",
      },
      requiresPermission: ["ReadOrder", "UpdateOrder"],
    },
  ],
});
