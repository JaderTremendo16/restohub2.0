import { gql } from "@apollo/client/core";

export const GET_CUSTOMER = gql`
  query GetCustomer($id: String!) {
    customer(id: $id) {
      id
      name
      email
    }
  }
`;

export const GET_ORDERS = gql`
  query {
    orders {
      id
      status
      priority
      channel
      area
      restaurant_id
      customer_id
      notes
      created_at
      validated_at
      preparation_started_at
      packing_at
      ready_at
      delivered_at
      estimated_preparation_time
    }
  }
`;

export const GET_ORDER_ITEMS = gql`
  query GetOrderItems($order_id: ID!) {
    orderItems(order_id: $order_id) {
      id
      product_name
      quantity
      unit_price
      subtotal
      notes
    }
  }
`;

export const GET_INVOICE = gql`
  query GetInvoice($order_id: ID!) {
    orderInvoice(order_id: $order_id) {
      id
      invoice_number
      subtotal
      tax
      total
      status
      customer_name
      customer_email
      customer_document
      payment_method
    }
  }
`;

export const GET_PAYMENT = gql`
  query GetPayment($order_id: ID!) {
    orderPayment(order_id: $order_id) {
      id
      transaction_id
      method
      status
      amount
      paid_at
    }
  }
`;

export const GET_PAID_INVOICES = gql`
  query {
    paidInvoices {
      order_id
      invoice_number
      total
      status
      payment_method
      customer_name
      created_at
    }
  }
`;

// ───────────────── MUTATIONS ─────────────────
export const CREATE_ORDER = gql`
  mutation CreateOrder(
    $restaurant_id: String!
    $customer_id: String!
    $channel: String!
    $notes: String
    $priority: String
  ) {
    createOrder(
      restaurant_id: $restaurant_id
      customer_id: $customer_id
      channel: $channel
      notes: $notes
      priority: $priority
    ) {
      id
      status
      channel
      area
      priority
    }
  }
`;

export const ADD_ITEMS = gql`
  mutation AddItems($order_id: ID!, $items: [OrderItemInput!]!) {
    addOrderItems(order_id: $order_id, items: $items) {
      id
      product_name
      quantity
      unit_price
      subtotal
    }
  }
`;

export const UPDATE_STATUS = gql`
  mutation UpdateStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
      validated_at
      delivered_at
    }
  }
`;

export const UPDATE_PRIORITY = gql`
  mutation UpdatePriority($id: ID!, $priority: String!) {
    updateOrderPriority(id: $id, priority: $priority) {
      id
      priority
    }
  }
`;

export const GENERATE_INVOICE = gql`
  mutation GenerateInvoice(
    $order_id: ID!
    $customer_name: String!
    $customer_email: String
    $customer_document: String
  ) {
    generateInvoice(
      order_id: $order_id
      customer_name: $customer_name
      customer_email: $customer_email
      customer_document: $customer_document
    ) {
      id
      invoice_number
      subtotal
      tax
      total
      status
      customer_name
      customer_email
      customer_document
      payment_method
    }
  }
`;

export const CREATE_PAYMENT = gql`
  mutation CreatePayment($order_id: ID!, $method: String!, $amount: Float!) {
    createPayment(order_id: $order_id, method: $method, amount: $amount) {
      id
      transaction_id
      status
      method
      amount
      paid_at
    }
  }
`;
