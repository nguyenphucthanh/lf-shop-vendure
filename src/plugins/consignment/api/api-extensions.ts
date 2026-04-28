import gql from 'graphql-tag';

export const adminApiExtensions = gql`
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
        note: String
    }

    type ConsignmentIntakeItem implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        quotationId: ID!
        quotation: ConsignmentQuotation!
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
    }

    type ConsignmentPaymentItem implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        quotationId: ID!
        quotation: ConsignmentQuotation!
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
        paidAmount: Money!
        remainingAmount: Money!
        items: [ConsignmentPaymentItem!]!
    }

    type ConsignmentReturnItem implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        quotationId: ID!
        quotation: ConsignmentQuotation!
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
        intakeValue: Money!
        paidQty: Int!
        paidValue: Money!
        returnedQty: Int!
        returnedValue: Money!
        debtQty: Int!
        debtValue: Money!
    }

    type TranslatedString {
        languageCode: String!
        name: String!
    }

    # ─── Inputs ────────────────────────────────────────────────────────────────

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

    input CreateConsignmentPaymentInput {
        storeId: ID!
        paymentDate: DateTime!
        paymentPolicy: String
        paymentMethod: String!
        paymentStatus: String!
        discount: Money
        paidAmount: Money
        items: [ConsignmentLineItemInput!]!
    }

    input UpdateConsignmentPaymentInput {
        id: ID!
        paymentDate: DateTime
        paymentPolicy: String
        paymentMethod: String
        paymentStatus: String
        discount: Money
        paidAmount: Money
        items: [ConsignmentLineItemInput!]
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

    # ─── Queries ───────────────────────────────────────────────────────────────

    extend type Query {
        consignmentQuotations(storeId: ID!): [ConsignmentQuotation!]!
        consignmentQuotation(id: ID!): ConsignmentQuotation
        consignmentIntakes(storeId: ID!): [ConsignmentIntake!]!
        consignmentIntake(id: ID!): ConsignmentIntake
        consignmentPayments(storeId: ID!): [ConsignmentPayment!]!
        consignmentPayment(id: ID!): ConsignmentPayment
        consignmentReturns(storeId: ID!): [ConsignmentReturn!]!
        consignmentReturn(id: ID!): ConsignmentReturn
        consignmentReport(storeId: ID!): [ConsignmentReportRow!]!
    }

    # ─── Mutations ─────────────────────────────────────────────────────────────

    extend type Mutation {
        createConsignmentQuotation(input: CreateConsignmentQuotationInput!): ConsignmentQuotation!
        updateConsignmentQuotation(input: UpdateConsignmentQuotationInput!): ConsignmentQuotation!
        deleteConsignmentQuotation(id: ID!): Boolean!

        createConsignmentIntake(input: CreateConsignmentIntakeInput!): ConsignmentIntake!
        updateConsignmentIntake(input: UpdateConsignmentIntakeInput!): ConsignmentIntake!
        deleteConsignmentIntake(id: ID!): Boolean!

        createConsignmentPayment(input: CreateConsignmentPaymentInput!): ConsignmentPayment!
        updateConsignmentPayment(input: UpdateConsignmentPaymentInput!): ConsignmentPayment!
        deleteConsignmentPayment(id: ID!): Boolean!

        createConsignmentReturn(input: CreateConsignmentReturnInput!): ConsignmentReturn!
        updateConsignmentReturn(input: UpdateConsignmentReturnInput!): ConsignmentReturn!
        deleteConsignmentReturn(id: ID!): Boolean!
    }
`;
