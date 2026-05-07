import { gql } from "graphql-tag";

export const adminApiExtensions = gql`
  """
  A cost record for a product variant in a specific channel and currency.
  """
  type ProductVariantCost implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    """
    The product variant ID.
    """
    variantId: ID!
    """
    The channel ID.
    """
    channelId: ID!
    """
    ISO 4217 currency code.
    """
    currencyCode: CurrencyCode!
    """
    Cost in minor units (cents for USD).
    """
    cost: Money!
  }

  """
  Input for upserting a product variant cost.
  """
  input UpsertProductVariantCostInput {
    """
    The product variant ID.
    """
    variantId: ID!
    """
    The channel ID.
    """
    channelId: ID!
    """
    ISO 4217 currency code.
    """
    currencyCode: CurrencyCode!
    """
    Cost in minor units (cents for USD). Must be non-negative.
    """
    cost: Money!
  }

  """
  A row in the sales margin report showing cost and margin data for an order line.
  """
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

  """
  Summary statistics for a sales margin report.
  """
  type SalesMarginSummary {
    totalRevenue: Money!
    totalCost: Money!
    totalMargin: Money!
    marginPercent: Float!
    orderCount: Int!
    currencyCode: CurrencyCode!
  }

  """
  Complete sales margin report with detail rows and summary statistics.
  """
  type SalesMarginReport {
    rows: [SalesMarginRow!]!
    summary: SalesMarginSummary!
  }

  extend type Query {
    """
    Get all product variant costs for a variant.
    Requires ReadCatalog permission.
    """
    productVariantCosts(variantId: ID!): [ProductVariantCost!]!
    """
    Get sales margin report for a date range.
    Analyzes revenue, costs and margin across placed orders.
    Requires ReadOrder permission.
    Date range is limited to 365 days maximum for performance.
    """
    salesMarginReport(from: DateTime!, to: DateTime!): SalesMarginReport!
  }

  extend type Mutation {
    """
    Upsert a product variant cost.
    Creates a new cost record or updates existing one.
    Requires UpdateCatalog permission.
    """
    upsertProductVariantCost(
      input: UpsertProductVariantCostInput!
    ): ProductVariantCost!
    """
    Delete a product variant cost by ID.
    Requires UpdateCatalog permission.
    Returns true if deleted, false if not found.
    """
    deleteProductVariantCost(id: ID!): Boolean!
  }
`;
