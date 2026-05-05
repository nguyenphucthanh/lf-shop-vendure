import { defineDashboardExtension } from "@vendure/dashboard";
import { ShoppingBagIcon } from "lucide-react";

import { PosShell } from "./pos-shell";

defineDashboardExtension({
  navSections: [
    {
      id: "pos",
      title: "POS",
      icon: ShoppingBagIcon,
      placement: "top",
      order: 200,
    },
  ],
  routes: [
    {
      path: "/pos",
      component: PosShell,
      navMenuItem: {
        sectionId: "pos",
        id: "pos",
        title: "Point of Sale",
        order: 100,
      },
    },
  ],
});
