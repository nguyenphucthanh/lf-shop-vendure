import gql from 'graphql-tag';

export const adminApiExtensions = gql`
    type ProductVariantCost implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        variantId: ID!
        channelId: ID!
        currencyCode: CurrencyCode!
        cost: Money!
    }

    input UpsertProductVariantCostInput {
        variantId: ID!
        channelId: ID!
        currencyCode: CurrencyCode!
        cost: Money!
    }

    type SalesMarginRow {
        orderId: ID!
        orderCode: String!
        orderDate: DateTime!
        productName: String!
        variantName: String!
        sku: String!
        quantity: Int!
        unitPrice: Money!
        lineTotal: Money!
        unitCost: Money!
        lineCost: Money!
        margin: Money!
        currencyCode: CurrencyCode!
    }

    type SalesMarginSummary {
        totalRevenue: Money!
        totalCost: Money!
        totalMargin: Money!
        marginPercent: Float!
        orderCount: Int!
        currencyCode: CurrencyCode!
    }

    type SalesMarginReport {
        rows: [SalesMarginRow!]!
        summary: SalesMarginSummary!
    }

    extend type Query {
        productVariantCosts(variantId: ID!): [ProductVariantCost!]!
        salesMarginReport(from: DateTime!, to: DateTime!): SalesMarginReport!
    }

    extend type Mutation {
        upsertProductVariantCost(input: UpsertProductVariantCostInput!): ProductVariantCost!
        deleteProductVariantCost(id: ID!): Boolean!
    }
`;
