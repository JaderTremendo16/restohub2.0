import { gql } from "@apollo/client/core";

export const GET_POS_ORDERS = gql`
  query GetPosOrders($restaurant_id: String) {
    posOrders(restaurant_id: $restaurant_id) {
      id
      status
      cashier_name
      table_ref
      notes
      subtotal
      tax
      total
      payment_method
      amount_received
      change_amount
      invoice_number
      customer_name
      sent_to_kitchen
      created_at
      items {
        id
        product_name
        quantity
        unit_price
        subtotal
        notes
      }
    }
  }
`;

export const CALC_CHANGE = gql`
  query CalcChange($total: Float!, $amount_received: Float!) {
    calculateChange(total: $total, amount_received: $amount_received) {
      total
      amount_received
      change_amount
      is_sufficient
    }
  }
`;

export const CREATE_POS_ORDER = gql`
  mutation CreatePosOrder(
    $restaurant_id: String!
    $cashier_name: String!
    $table_ref: String
    $notes: String
    $items: [PosItemInput!]!
  ) {
    createPosOrder(
      restaurant_id: $restaurant_id
      cashier_name: $cashier_name
      table_ref: $table_ref
      notes: $notes
      items: $items
    ) {
      id
      status
      total
      invoice_number
    }
  }
`;

export const ADD_POS_ITEM = gql`
  mutation AddPosItem($pos_order_id: ID!, $item: PosItemInput!) {
    addPosItem(pos_order_id: $pos_order_id, item: $item) {
      id
      product_name
      quantity
      subtotal
    }
  }
`;

export const REMOVE_POS_ITEM = gql`
  mutation RemovePosItem($item_id: ID!) {
    removePosItem(item_id: $item_id)
  }
`;

export const BILL_POS_ORDER = gql`
  mutation BillPosOrder(
    $id: ID!
    $customer_name: String
    $customer_document: String
  ) {
    billPosOrder(
      id: $id
      customer_name: $customer_name
      customer_document: $customer_document
    ) {
      id
      status
      invoice_number
      total
    }
  }
`;

export const PAY_POS_ORDER = gql`
  mutation PayPosOrder(
    $id: ID!
    $payment_method: String!
    $amount_received: Float!
  ) {
    payPosOrder(
      id: $id
      payment_method: $payment_method
      amount_received: $amount_received
    ) {
      id
      status
      change_amount
      amount_received
      total
      payment_method
    }
  }
`;

export const CANCEL_POS_ORDER = gql`
  mutation CancelPosOrder($id: ID!) {
    cancelPosOrder(id: $id) {
      id
      status
    }
  }
`;

export const DELIVER_POS_ORDER = gql`
  mutation DeliverPosOrder($id: ID!) {
    deliverPosOrder(id: $id) {
      id
      status
    }
  }
`;

export const CONFIRM_POS_ORDER = gql`
  mutation ConfirmPosOrder($id: ID!) {
    confirmPosOrder(id: $id) {
      id
      sent_to_kitchen
    }
  }
`;
