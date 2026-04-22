const { gql } = require("graphql-tag");
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type KitchenOrderItem {
    id: ID!
    product_name: String!
    quantity: Int!
    notes: String
  }

  type KitchenOrder @key(fields: "id") {
    id: ID!
    order_id: ID!
    restaurant_id: String!
    customer_id: String!
    channel: String!
    status: String!
    priority: String!
    origin: String
    assigned_cook_id: ID
    notes: String
    received_at: String
    ready_at: String
    created_at: String
    updated_at: String
    items: [KitchenOrderItem!]!
  }

  type Cook {
    id: ID!
    name: String!
    email: String!
    restaurant_id: String!
    role: String!
    active: Boolean!
  }

  type KitchenAuthPayload {
    token: String!
    cook: Cook!
  }

  type Query {
    kitchenOrders: [KitchenOrder!]!
    kitchenOrder(id: ID!): KitchenOrder
    cooks: [Cook!]!
  }

  type Mutation {
    loginCook(email: String!, password: String!): KitchenAuthPayload!
    updateKitchenOrderStatus(id: ID!, status: String!): KitchenOrder!
    assignCook(order_id: ID!, cook_id: ID!): KitchenOrder!
    registerCook(
      name: String!
      email: String!
      password: String!
      restaurant_id: String!
      role: String
    ): Cook!
  }
`;
module.exports = typeDefs;
