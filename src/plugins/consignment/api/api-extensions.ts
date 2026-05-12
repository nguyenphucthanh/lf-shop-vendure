import { gql } from "graphql-tag";

export const adminApiExtensions = gql`
  enum ConsignmentHistoryObjectType {
    QUOTATION
    INTAKE
    RETURN
    SOLD
    PAYMENT
    SETTLEMENT
  }

  enum ConsignmentHistoryEntryType {
    CREATED
    UPDATED
    DELETED
    NOTE_ADDED
  }

  type ConsignmentHistoryChange {
    field: String!
    before: JSON
    after: JSON
  }

  type ConsignmentHistoryEntry implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    objectType: ConsignmentHistoryObjectType!
    objectId: ID!
    type: ConsignmentHistoryEntryType!
    actorUserId: ID
    actorIdentifier: String
    changes: [ConsignmentHistoryChange!]!
    note: String
    data: JSON
  }

  type ConsignmentQuotation implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    productVariantId: ID!
    productVariantName: String!
    productVariantSku: String!
    productVariantFeaturedAsset: Asset
    consignmentPrice: Money!
    currency: String!
    note: String
    history: [ConsignmentHistoryEntry!]!
  }

  type ConsignmentIntakeItem implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    quotationId: ID!
    quotation: ConsignmentQuotation!
    currency: String!
    productPriceSnapshot: Money!
    consignmentPriceSnapshot: Money!
    quantity: Int!
    subtotal: Money!
  }

  type ConsignmentIntake implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    intakeDate: DateTime!
    paymentPolicy: String
    deliveryMethod: String
    deliveryTrackingCode: String
    deliveryCost: Money!
    total: Money!
    items: [ConsignmentIntakeItem!]!
    history: [ConsignmentHistoryEntry!]!
  }

  type ConsignmentSold implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    soldDate: DateTime!
    items: [ConsignmentSoldItem!]!
    total: Money!
    history: [ConsignmentHistoryEntry!]!
  }

  type ConsignmentSoldItem implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    quotationId: ID!
    quotation: ConsignmentQuotation!
    currency: String!
    productPriceSnapshot: Money!
    consignmentPriceSnapshot: Money!
    quantity: Int!
    subtotal: Money!
  }

  type ConsignmentPayment implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    paymentDate: DateTime!
    paymentPolicy: String
    paymentMethod: String!
    paymentStatus: String!
    subtotal: Money!
    discount: Money!
    total: Money!
    soldId: ID
    sold: ConsignmentSold
    history: [ConsignmentHistoryEntry!]!
  }

  type ConsignmentReturnItem implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    quotationId: ID!
    quotation: ConsignmentQuotation!
    currency: String!
    productPriceSnapshot: Money!
    consignmentPriceSnapshot: Money!
    quantity: Int!
    subtotal: Money!
  }

  type ConsignmentReturn implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    returnedDate: DateTime!
    reason: String
    total: Money!
    items: [ConsignmentReturnItem!]!
    history: [ConsignmentHistoryEntry!]!
  }

  enum SettlementStatus {
    OPEN
    APPROVED
    PAID
    CLOSED
  }

  type ConsignmentSettlement implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    storeId: ID!
    settlementDate: DateTime!
    status: SettlementStatus!
    description: String
    approvedAt: DateTime
    paidAt: DateTime
    closedAt: DateTime
    history: [ConsignmentHistoryEntry!]!
  }

  type ConsignmentReportRow {
    quotationId: ID!
    productVariantId: ID!
    productNameTranslations: [TranslatedString!]!
    variantNameTranslations: [TranslatedString!]!
    sku: String!
    featuredAsset: Asset
    consignmentPrice: Money!
    intakeQty: Int!
    soldQty: Int!
    returnedQty: Int!
    debtQty: Int!
  }

  type TranslatedString {
    languageCode: String!
    name: String!
  }

  input CreateConsignmentQuotationInput {
    storeId: ID!
    productVariantId: ID!
    consignmentPrice: Money!
    note: String
  }

  input UpdateConsignmentQuotationInput {
    id: ID!
    consignmentPrice: Money
    note: String
  }

  input ConsignmentLineItemInput {
    quotationId: ID!
    quantity: Int!
    consignmentPriceSnapshot: Money
  }

  input CreateConsignmentIntakeInput {
    storeId: ID!
    intakeDate: DateTime!
    paymentPolicy: String
    deliveryMethod: String
    deliveryTrackingCode: String
    deliveryCost: Money
    items: [ConsignmentLineItemInput!]!
  }

  input UpdateConsignmentIntakeInput {
    id: ID!
    intakeDate: DateTime
    paymentPolicy: String
    deliveryMethod: String
    deliveryTrackingCode: String
    deliveryCost: Money
    items: [ConsignmentLineItemInput!]
  }

  input CreateConsignmentSoldInput {
    storeId: ID!
    soldDate: DateTime!
    items: [ConsignmentLineItemInput!]!
  }

  input UpdateConsignmentSoldInput {
    id: ID!
    soldDate: DateTime
    items: [ConsignmentLineItemInput!]
  }

  input CreateConsignmentPaymentInput {
    storeId: ID!
    paymentDate: DateTime!
    paymentPolicy: String
    paymentMethod: String!
    paymentStatus: String!
    subtotal: Money!
    discount: Money
    soldId: ID
  }

  input UpdateConsignmentPaymentInput {
    id: ID!
    paymentDate: DateTime
    paymentPolicy: String
    paymentMethod: String
    paymentStatus: String
    subtotal: Money
    discount: Money
    soldId: ID
  }

  input CreateConsignmentReturnInput {
    storeId: ID!
    returnedDate: DateTime!
    reason: String
    items: [ConsignmentLineItemInput!]!
  }

  input UpdateConsignmentReturnInput {
    id: ID!
    returnedDate: DateTime
    reason: String
    items: [ConsignmentLineItemInput!]
  }

  input CreateConsignmentSettlementInput {
    storeId: ID!
    settlementDate: DateTime!
    description: String
  }

  extend type Query {
    consignmentHistory(
      objectType: ConsignmentHistoryObjectType!
      objectId: ID!
    ): [ConsignmentHistoryEntry!]!
    consignmentQuotations(storeId: ID!): [ConsignmentQuotation!]!
    consignmentQuotation(id: ID!): ConsignmentQuotation
    consignmentIntakes(storeId: ID!): [ConsignmentIntake!]!
    consignmentIntake(id: ID!): ConsignmentIntake
    consignmentSolds(storeId: ID!): [ConsignmentSold!]!
    consignmentSold(id: ID!): ConsignmentSold
    consignmentPayments(storeId: ID!): [ConsignmentPayment!]!
    consignmentPayment(id: ID!): ConsignmentPayment
    consignmentReturns(storeId: ID!): [ConsignmentReturn!]!
    consignmentReturn(id: ID!): ConsignmentReturn
    consignmentSettlements(storeId: ID!): [ConsignmentSettlement!]!
    consignmentSettlement(id: ID!): ConsignmentSettlement
    consignmentActiveSettlement(storeId: ID!): ConsignmentSettlement
    consignmentReport(storeId: ID!): [ConsignmentReportRow!]!
    consignmentTotalReport: ConsignmentTotalReport!
  }

  type ConsignmentTotalReportSummary {
    totalStores: Int!
    totalCollectedPayments: Money!
    totalIntakeItems: Int!
  }

  type ConsignmentTotalReportVariantRow {
    productVariantId: ID!
    productNameTranslations: [TranslatedString!]!
    variantNameTranslations: [TranslatedString!]!
    sku: String!
    featuredAsset: Asset
    totalIntakeQty: Int!
    totalSoldQty: Int!
    totalReturnedQty: Int!
  }

  type ConsignmentTotalReport {
    summary: ConsignmentTotalReportSummary!
    rows: [ConsignmentTotalReportVariantRow!]!
  }

  extend type Mutation {
    addConsignmentHistoryNote(
      objectType: ConsignmentHistoryObjectType!
      objectId: ID!
      note: String!
    ): ConsignmentHistoryEntry!
    createConsignmentQuotation(
      input: CreateConsignmentQuotationInput!
    ): ConsignmentQuotation!
    updateConsignmentQuotation(
      input: UpdateConsignmentQuotationInput!
    ): ConsignmentQuotation!
    deleteConsignmentQuotation(id: ID!): Boolean!

    createConsignmentIntake(
      input: CreateConsignmentIntakeInput!
    ): ConsignmentIntake!
    updateConsignmentIntake(
      input: UpdateConsignmentIntakeInput!
    ): ConsignmentIntake!
    deleteConsignmentIntake(id: ID!): Boolean!

    createConsignmentSold(input: CreateConsignmentSoldInput!): ConsignmentSold!
    updateConsignmentSold(input: UpdateConsignmentSoldInput!): ConsignmentSold!
    deleteConsignmentSold(id: ID!): Boolean!

    createConsignmentPayment(
      input: CreateConsignmentPaymentInput!
    ): ConsignmentPayment!
    updateConsignmentPayment(
      input: UpdateConsignmentPaymentInput!
    ): ConsignmentPayment!
    deleteConsignmentPayment(id: ID!): Boolean!

    createConsignmentReturn(
      input: CreateConsignmentReturnInput!
    ): ConsignmentReturn!
    updateConsignmentReturn(
      input: UpdateConsignmentReturnInput!
    ): ConsignmentReturn!
    deleteConsignmentReturn(id: ID!): Boolean!

    createConsignmentSettlement(
      input: CreateConsignmentSettlementInput!
    ): ConsignmentSettlement!
    approveConsignmentSettlement(id: ID!): ConsignmentSettlement!
    markConsignmentSettlementAsPaid(id: ID!): ConsignmentSettlement!
    closeConsignmentSettlement(id: ID!): ConsignmentSettlement!
  }
`;
