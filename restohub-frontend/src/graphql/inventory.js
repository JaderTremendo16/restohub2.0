import { gql } from "@apollo/client/core";

// ─── QUERIES ────────────────────────────────────────────────────

// Trae órdenes de suministro, opcionalmente filtradas por estado
export const GET_SUPPLY_ORDERS = gql`
  query GetSupplyOrders($status: SupplyOrderStatus, $location_id: Int) {
    supplyOrders(status: $status, location_id: $location_id) {
      id
      supplier_id
      location_id
      status
      total_cost
      order_date
      received_date
      notes
    }
  }
`;

// Trae una orden específica con sus items
export const GET_SUPPLY_ORDER = gql`
  query GetSupplyOrder($id: ID!) {
    supplyOrder(id: $id) {
      id
      supplier_id
      location_id
      status
      total_cost
      order_date
      received_date
      notes
      items {
        id
        ingredient_id
        quantity
        unit
        unit_cost
        received_quantity
      }
    }
  }
`;

// Trae lotes por ubicación y estado
export const GET_BATCHES = gql`
  query GetBatches($location_id: ID, $status: BatchStatus) {
    batches(location_id: $location_id, status: $status) {
      id
      ingredient_id
      location_id
      expiration_date
      current_quantity
      unit
      status
    }
  }
`;

// Trae lotes que vencen en los próximos N días — clave para el Dashboard
export const GET_EXPIRING_BATCHES = gql`
  query GetExpiringBatches($days: Int!, $location_id: Int) {
    expiringBatches(days: $days, location_id: $location_id) {
      id
      ingredient_id
      location_id
      expiration_date
      current_quantity
      unit
      status
    }
  }
`;

// Trae el stock total por ubicación
export const GET_STOCKS = gql`
  query GetStocks($location_id: ID) {
    stocks(location_id: $location_id) {
      id
      ingredient_id
      location_id
      total_quantity
      unit
    }
  }
`;

// Trae el stock de un ingrediente específico en una ubicación
export const GET_STOCK = gql`
  query GetStock($ingredient_id: ID!, $location_id: ID!) {
    stock(ingredient_id: $ingredient_id, location_id: $location_id) {
      id
      ingredient_id
      location_id
      total_quantity
      unit
    }
  }
`;

// Trae las configuraciones de stock mínimo — para saber cuándo hay stock crítico
export const GET_LOW_STOCK_CONFIGS = gql`
  query GetLowStockConfigs($location_id: ID) {
    lowStockConfigs(location_id: $location_id) {
      id
      ingredient_id
      location_id
      min_threshold
      unit
      is_active
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────

export const CREATE_SUPPLY_ORDER = gql`
  mutation CreateSupplyOrder($input: CreateSupplyOrderInput!) {
    createSupplyOrder(input: $input) {
      id
      supplier_id
      location_id
      status
      order_date
      notes
    }
  }
`;

// Marca una orden como recibida
export const RECEIVE_SUPPLY_ORDER = gql`
  mutation ReceiveSupplyOrder($id: ID!, $received_date: String!) {
    receiveSupplyOrder(id: $id, received_date: $received_date) {
      id
      status
      received_date
    }
  }
`;

export const CANCEL_SUPPLY_ORDER = gql`
  mutation CancelSupplyOrder($id: ID!, $input: UpdateSupplyOrderInput!) {
    updateSupplyOrder(id: $id, input: $input) {
      id
      status
    }
  }
`;

export const UPDATE_SUPPLY_ORDER = gql`
  mutation UpdateSupplyOrder($id: ID!, $input: UpdateSupplyOrderInput!) {
    updateSupplyOrder(id: $id, input: $input) {
      id
      status
    }
  }
`;

export const ADD_SUPPLY_ORDER_ITEM = gql`
  mutation AddSupplyOrderItem($input: AddSupplyOrderItemInput!) {
    addSupplyOrderItem(input: $input) {
      id
      supply_order_id
      ingredient_id
      quantity
      unit
      unit_cost
    }
  }
`;

export const ADJUST_STOCK = gql`
  mutation AdjustStock($input: AdjustStockInput!) {
    adjustStock(input: $input) {
      id
      ingredient_id
      location_id
      total_quantity
      unit
    }
  }
`;

export const CREATE_LOW_STOCK_CONFIG = gql`
  mutation CreateLowStockConfig($input: CreateLowStockConfigInput!) {
    createLowStockConfig(input: $input) {
      id
      ingredient_id
      location_id
      min_threshold
      unit
      is_active
    }
  }
`;

export const UPDATE_LOW_STOCK_CONFIG = gql`
  mutation UpdateLowStockConfig($id: ID!, $input: UpdateLowStockConfigInput!) {
    updateLowStockConfig(id: $id, input: $input) {
      id
      min_threshold
      unit
      is_active
    }
  }
`;

export const TOGGLE_LOW_STOCK_CONFIG = gql`
  mutation ToggleLowStockConfig($id: ID!) {
    toggleLowStockConfig(id: $id) {
      id
      is_active
    }
  }
`;
