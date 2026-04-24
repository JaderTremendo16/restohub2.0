const { gql } = require("graphql-tag");

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Order @key(fields: "id") {
    id: ID!
    restaurant_id: String!
    customer_id: String!
    channel: String!
    status: String!
    priority: String!
    area: String
    notes: String
    estimated_preparation_time: Int
    validated_at: String
    preparation_started_at: String
    packing_at: String
    ready_at: String
    delivered_at: String
    created_at: String!
    updated_at: String!
  }

  type OrderItem {
    id: ID!
    order_id: ID!
    product_id: String!
    product_name: String!
    quantity: Int!
    unit_price: Float!
    subtotal: Float!
    notes: String
  }

  type Invoice {
    id: ID!
    order_id: ID!
    invoice_number: String!
    subtotal: Float!
    tax: Float!
    total: Float!
    status: String!
    customer_name: String!
    customer_email: String
    customer_document: String
    payment_method: String
    created_at: String
  }

  type Payment {
    id: ID!
    invoice_id: ID!
    amount: Float!
    method: String!
    status: String!
    transaction_id: String
    gateway: String
    paid_at: String
  }

  type OrderTiming {
    order_id: ID!
    status: String!
    area: String
    estimated_preparation_time: Int
    waiting_minutes: Int
    preparation_minutes: Int
    total_minutes: Int
  }

  input OrderItemInput {
    product_id: String!
    product_name: String!
    quantity: Int!
    unit_price: Float!
    notes: String
  }

  type WompiPaymentLink {
    payment_url: String!
    payment_link_id: String!
    amount: Float!
    invoice_number: String!
  }

  type MonthlyReport {
    year: Int!
    month: Int!
    monthName: String!
    totalOrders: Int!
    totalRevenue: Float!
    averageTicket: Float!
  }

  type Query {
    orders(customer_id: String): [Order!]!
    order(id: ID!): Order
    orderItems(order_id: ID!): [OrderItem!]!
    orderInvoice(order_id: ID!): Invoice
    orderPayment(order_id: ID!): Payment
    orderTiming(id: ID!): OrderTiming
    monthlyReport(fromYear: Int, toYear: Int, restaurant_id: String): [MonthlyReport!]!
    paidInvoices: [PaidInvoice!]!
  }

  type PaidInvoice {
    order_id: ID!
    invoice_number: String!
    total: Float!
    status: String!
    payment_method: String
    customer_name: String!
    created_at: String!
  }

  type Mutation {
    createOrder(
      restaurant_id: String!
      customer_id: String!
      channel: String!
      notes: String
      priority: String
    ): Order!

    updateOrderStatus(id: ID!, status: String!): Order!
    updateOrderPriority(id: ID!, priority: String!): Order!
    addOrderItems(order_id: ID!, items: [OrderItemInput!]!): [OrderItem!]!

    generateInvoice(
      order_id: ID!
      customer_name: String!
      customer_email: String
      customer_document: String
    ): Invoice!

    createPayment(order_id: ID!, method: String!, amount: Float!): Payment!
    createWompiPaymentLink(order_id: ID!): WompiPaymentLink!
  }
`;

module.exports = typeDefs;
