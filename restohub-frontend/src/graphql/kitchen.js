import { gql } from "@apollo/client/core";

export const LOGIN_COOK = gql`
  mutation LoginCook($email: String!, $password: String!, $restaurant_id: String) {
    loginCook(email: $email, password: $password, restaurant_id: $restaurant_id) {
      token
      cook {
        id
        name
        email
        role
        restaurant_id
      }
    }
  }
`;

export const REGISTER_COOK = gql`
  mutation RegisterCook(
    $name: String!
    $email: String!
    $password: String!
    $restaurant_id: String!
    $role: String
  ) {
    registerCook(
      name: $name
      email: $email
      password: $password
      restaurant_id: $restaurant_id
      role: $role
    ) {
      id
      name
      email
      role
    }
  }
`;

export const GET_KITCHEN_ORDERS = gql`
  query GetKitchenOrders($restaurant_id: String) {
    kitchenOrders(restaurant_id: $restaurant_id) {
      id
      order_id
      status
      priority
      channel
      origin
      restaurant_id
      received_at
      ready_at
      notes
      items {
        id
        product_name
        quantity
        notes
      }
    }
  }
`;

export const UPDATE_KITCHEN_STATUS = gql`
  mutation UpdateKitchenStatus($id: ID!, $status: String!) {
    updateKitchenOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;
