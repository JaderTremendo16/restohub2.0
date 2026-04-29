import gql from "graphql-tag";

const typeDefs = gql`
  enum Unit {
    kg
    g
    l
    L
    ml
    unidad
  }

  enum SupplyOrderStatus {
    PENDIENTE
    RECIBIDO
    CANCELADO
  }

  enum BatchStatus {
    ACTIVO
    AGOTADO
    VENCIDO
  }

  enum LogType {
    ENTRADA
    SALIDA
    AJUSTE
  }

  type SupplyOrder {
    id: ID!
    supplier_id: Int!
    location_id: Int!
    status: SupplyOrderStatus!
    total_cost: Float!
    order_date: String!
    received_date: String
    notes: String
    items: [SupplyOrderItem!]!
    created_at: String!
    updated_at: String!
  }

  type SupplyOrderItem {
    id: ID!
    supply_order_id: Int!
    ingredient_id: Int!
    quantity: Float!
    unit: Unit!
    unit_cost: Float!
    received_quantity: Float!
  }

  type Batch {
    id: ID!
    supply_order_id: Int!
    ingredient_id: Int!
    location_id: Int!
    supplier_id: Int!
    entry_date: String!
    expiration_date: String!
    initial_quantity: Float!
    current_quantity: Float!
    unit: Unit!
    status: BatchStatus!
    created_at: String!
    updated_at: String!
  }

  type Stock {
    id: ID!
    ingredient_id: Int!
    location_id: Int!
    total_quantity: Float!
    unit: Unit!
    updated_at: String
  }

  type InventoryLog {
    id: ID!
    ingredient_id: Int!
    location_id: Int!
    type: LogType!
    quantity: Float!
    unit: Unit!
    reason: String
    reference_id: Int
    created_at: String
  }

  type LowStockConfig {
    id: ID!
    ingredient_id: Int!
    location_id: Int!
    min_threshold: Float!
    unit: Unit!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  type Query {
    supplyOrders(status: SupplyOrderStatus, location_id: Int): [SupplyOrder!]!
    supplyOrder(id: ID!): SupplyOrder

    batches(location_id: Int, status: BatchStatus): [Batch!]!
    batch(id: ID!): Batch
    expiringBatches(days: Int!, location_id: Int): [Batch!]!

    stocks(location_id: ID): [Stock!]!
    stock(ingredient_id: ID!, location_id: ID!): Stock

    inventoryLogs(
      ingredient_id: ID
      location_id: ID
      type: LogType
    ): [InventoryLog!]!

    lowStockConfigs(location_id: ID, OnlyActive: Boolean): [LowStockConfig!]!
  }

  type Mutation {
    createSupplyOrder(input: CreateSupplyOrderInput!): SupplyOrder!
    updateSupplyOrder(id: ID!, input: UpdateSupplyOrderInput!): SupplyOrder!
    receiveSupplyOrder(id: ID!, received_date: String!): SupplyOrder!

    addSupplyOrderItem(input: AddSupplyOrderItemInput!): SupplyOrderItem!
    updateSupplyOrderItem(
      id: ID!
      input: UpdateSupplyOrderItemInput!
    ): SupplyOrderItem!

    createBatch(input: CreateBatchInput!): Batch!
    updateBatch(id: ID!, current_quantity: Float!): Batch!

    upsertStock(input: UpsertStockInput!): Stock!
    adjustStock(input: AdjustStockInput!): Stock!

    createLowStockConfig(input: CreateLowStockConfigInput!): LowStockConfig!
    updateLowStockConfig(
      id: ID!
      input: UpdateLowStockConfigInput!
    ): LowStockConfig!
    deleteLowStockConfig(id: ID!): LowStockConfig!
  }

  input CreateSupplyOrderInput {
    supplier_id: Int!
    location_id: Int!
    total_cost: Float
    notes: String
  }

  input AddSupplyOrderItemInput {
    supply_order_id: Int!
    ingredient_id: Int!
    quantity: Float!
    unit: Unit!
    unit_cost: Float!
    received_quantity: Float
  }

  input UpdateSupplyOrderInput {
    supplier_id: Int
    location_id: Int
    total_cost: Float
    order_date: String
    notes: String
    status: SupplyOrderStatus
  }

  input UpdateSupplyOrderItemInput {
    quantity: Float
    unit_cost: Float
    received_quantity: Float
  }

  input CreateBatchInput {
    supply_order_id: Int!
    ingredient_id: Int!
    location_id: Int!
    supplier_id: Int!
    expiration_date: String!
    initial_quantity: Float!
    unit: Unit!
  }

  input UpsertStockInput {
    ingredient_id: Int!
    location_id: Int!
    total_quantity: Float!
    unit: Unit!
  }

  input AdjustStockInput {
    ingredient_id: Int!
    location_id: Int!
    quantity: Float!
    unit: Unit!
    type: LogType!
    reason: String
    reference_id: Int
  }

  input CreateLowStockConfigInput {
    ingredient_id: Int!
    location_id: Int!
    min_threshold: Float!
    unit: Unit!
  }

  input UpdateLowStockConfigInput {
    min_threshold: Float
    unit: Unit
  }
`;

export default typeDefs;
