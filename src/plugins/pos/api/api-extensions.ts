import { gql } from "graphql-tag";

export const adminApiExtensions = gql`
  extend type Mutation {
    setPosManualDiscount(
      orderId: ID!
      amount: Money!
      description: String
    ): Order!
  }
`;
