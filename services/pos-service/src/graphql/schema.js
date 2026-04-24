const { gql } = require("graphql-tag");

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type PosOrder @key(fields: "id") {
    id: ID!
    restaurant_id: String!
    cashier_name: String!
    table_ref: String
    notes: String
    status: String!
    payment_method: String
    subtotal: Float!
    tax: Float!
    total: Float!
    amount_received: Float
    change_amount: Float
    invoice_number: String
    customer_name: String
    customer_document: String
    orders_service_id: String
    sent_to_kitchen: Boolean!
    created_at: String!
    items: [PosOrderItem!]!
  }

  type PosOrderItem {
    id: ID!
    pos_order_id: ID!
    product_id: String
    product_name: String!
    quantity: Int!
    unit_price: Float!
    subtotal: Float!
    notes: String
  }

  type ChangeCalculation {
    total: Float!
    amount_received: Float!
    change_amount: Float!
    is_sufficient: Boolean!
  }

  type PosInvoice {
    invoice_number: String!
    cashier_name: String!
    table_ref: String
    customer_name: String
    customer_document: String
    items: [PosOrderItem!]!
    subtotal: Float!
    tax: Float!
    total: Float!
    payment_method: String!
    amount_received: Float
    change_amount: Float
    created_at: String!
  }

  input PosItemInput {
    product_id: String
    product_name: String!
    quantity: Int!
    unit_price: Float!
    notes: String
  }

  type PosMonthlyReport {
    year: Int!
    month: Int!
    monthName: String!
    totalOrders: Int!
    totalRevenue: Float!
    averageTicket: Float!
  }

  type Query {
    posOrders(restaurant_id: String): [PosOrder!]!
    posOrder(id: ID!): PosOrder
    calculateChange(total: Float!, amount_received: Float!): ChangeCalculation!
    posInvoice(id: ID!): PosInvoice
    posMonthlyReport(fromYear: Int, toYear: Int, restaurant_id: String): [PosMonthlyReport!]!
  }

  type Mutation {
    createPosOrder(
      restaurant_id: String!
      cashier_name: String!
      table_ref: String
      notes: String
      items: [PosItemInput!]!
    ): PosOrder!

    deliverPosOrder(id: ID!): PosOrder!

    addPosItem(pos_order_id: ID!, item: PosItemInput!): PosOrderItem!

    removePosItem(item_id: ID!): Boolean!

    billPosOrder(
      id: ID!
      customer_name: String
      customer_document: String
    ): PosOrder!

    payPosOrder(
      id: ID!
      payment_method: String!
      amount_received: Float!
    ): PosOrder!

    cancelPosOrder(id: ID!): PosOrder!
    confirmPosOrder(id: ID!): PosOrder!
  }
`;

module.exports = typeDefs;
