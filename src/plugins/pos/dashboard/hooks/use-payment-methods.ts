import { api } from "@vendure/dashboard";
import { useEffect, useState } from "react";

import { graphql } from "@/gql";

const ELIGIBLE_PAYMENT_METHODS = graphql(`
  query PosPaymentMethods($take: Int!) {
    paymentMethods(options: { take: $take }) {
      items {
        id
        code
        name
        description
      }
    }
  }
`);

export interface PosPaymentMethod {
  id: string;
  code: string;
  name: string;
  description: string;
}

export function usePaymentMethods(orderId: string | undefined) {
  const [methods, setMethods] = useState<PosPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setMethods([]);
      return;
    }
    setLoading(true);
    void api
      .query(ELIGIBLE_PAYMENT_METHODS, { take: 50 })
      .then((result) => {
        setMethods(result?.paymentMethods?.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  return { methods, loading };
}
