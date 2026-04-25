import { gql } from "@apollo/client";

export const CREATE_PAYPAL_ORDER = gql`
  mutation CreatePaypalOrder($total: Float!) {
    createPaypalOrder(total: $total)
  }
`;

export const CAPTURE_PAYPAL_ORDER = gql`
  mutation CapturePaypalOrder($paypalOrderId: String!, $cid: String!, $rid: String!, $itemsJson: String!, $total: Float!) {
    capturePaypalOrder(paypalOrderId: $paypalOrderId, customerId: $cid, restaurantId: $rid, itemsJson: $itemsJson, total: $total)
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      message
      user {
        id
        name
        email
        phone
        role
        preferences
        country
        city
        branch
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register(
    $name: String!
    $email: String!
    $password: String!
    $phone: String
    $country: String
    $city: String
    $branch: String
  ) {
    createUser(
      name: $name
      email: $email
      password: $password
      phone: $phone
      country: $country
      city: $city
      branch: $branch
    ) {
      id
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile(
    $id: String!
    $name: String!
    $email: String!
    $phone: String
    $country: String
    $city: String
    $branch: String
  ) {
    updateUserProfile(
      id: $id
      name: $name
      email: $email
      phone: $phone
      country: $country
      city: $city
      branch: $branch
    ) {
      id
      name
      email
      phone
      country
      city
      branch
    }
  }
`;

// Esta query llama al menu-service real (no al customer-service)
export const GET_DISHES = gql`
  query GetDishes($OnlyActive: Boolean, $location_id: Int) {
    dishes(OnlyActive: $OnlyActive, location_id: $location_id) {
      id
      name
      description
      category
      is_active
      prices {
        price
      }
    }
  }
`;

export const COMPLETE_ORDER_MUTATION = gql`
  mutation CompleteOrder(
    $cid: String!
    $items: String!
    $total: Float!
    $branch: String!
    $orderId: String
  ) {
    completeOrder(
      customerId: $cid
      items: $items
      totalPrice: $total
      branch: $branch
      orderId: $orderId
    )
  }
`;

export const GET_LIVE_ORDERS = gql`
  query GetLiveOrders($cid: String!) {
    orders(customer_id: $cid) {
      id
      status
      restaurant_id
      channel
      notes
      created_at
    }
  }
`;

export const GET_ORDER_ITEMS_LIVE = gql`
  query GetOrderItemsLive($order_id: ID!) {
    orderItems(order_id: $order_id) {
      id
      product_name
      quantity
      unit_price
      subtotal
    }
  }
`;

export const CREATE_REAL_ORDER = gql`
  mutation CreateRealOrder(
    $restaurant_id: String!
    $customer_id: String!
    $channel: String!
    $priority: String
  ) {
    createOrder(
      restaurant_id: $restaurant_id
      customer_id: $customer_id
      channel: $channel
      priority: $priority
    ) {
      id
      status
    }
  }
`;

export const ADD_ORDER_ITEMS = gql`
  mutation AddOrderItems($order_id: ID!, $items: [OrderItemInput!]!) {
    addOrderItems(order_id: $order_id, items: $items) {
      id
    }
  }
`;

export const GET_ALL_RATINGS = gql`
  query GetAllRatings($branch: String) {
    allRatings(branch: $branch) {
      id
      itemName
      stars
      comment
      createdAt
      customerId
      customerName
    }
  }
`;

export const GET_CUSTOMER_RATINGS = gql`
  query GetCustomerRatings($cid: String!) {
    ratings(customerId: $cid) {
      id
    }
  }
`;

export const GET_RATING_FOR_DISH = gql`
  query GetRatingForDish($cid: String!, $itemName: String!) {
    ratingForDish(customerId: $cid, itemName: $itemName) {
      id
      stars
      comment
    }
  }
`;

export const CREATE_RATING_MUTATION = gql`
  mutation CreateRating(
    $cid: String!
    $item: String!
    $stars: Int!
    $comment: String
  ) {
    createRating(
      customerId: $cid
      itemName: $item
      stars: $stars
      comment: $comment
    ) {
      id
    }
  }
`;

export const UPDATE_RATING_MUTATION = gql`
  mutation UpdateRating($id: String!, $stars: Int!, $comment: String) {
    updateRating(id: $id, stars: $stars, comment: $comment) {
      id
    }
  }
`;

export const DELETE_RATING_MUTATION = gql`
  mutation DeleteRating($id: String!) {
    deleteRating(id: $id)
  }
`;

export const GET_ORDERS = gql`
  query GetOrders($cid: String!) {
    customerOrders(customerId: $cid) {
      id
      items
      totalPrice
      branch
      createdAt
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($branch: String) {
    customers(branch: $branch) {
      id
      name
      email
      phone
      role
      country
      city
      branch
    }
  }
`;

export const GET_LOYALTY_ACCOUNT = gql`
  query GetLoyaltyAccount($customerId: String!) {
    loyaltyAccount(customerId: $customerId) {
      totalPoints
      tier
    }
  }
`;

export const GET_ALL_LOYALTY_ACCOUNTS = gql`
  query GetAllLoyaltyAccounts {
    allLoyaltyAccounts {
      customerId
      totalPoints
      tier
    }
  }
`;

export const GET_POINT_HISTORY = gql`
  query GetPointHistory($customerId: String!) {
    pointHistory(customerId: $customerId) {
      actionType
      points
      description
      createdAt
    }
  }
`;

export const GET_PROMOTIONS = gql`
  query GetPromotions($activeOnly: Boolean, $branch: String) {
    promotions(activeOnly: $activeOnly, branch: $branch) {
      id
      title
      description
      discountPercent
      isActive
      branch
    }
  }
`;

export const GET_COUNTRIES = gql`
  query GetCountries {
    countries {
      id
      name
    }
  }
`;

export const GET_LOCATIONS = gql`
  query GetLocations {
    locations {
      id
      name
      address
      countryId
    }
  }
`;

export const TOGGLE_PROMOTION_MUTATION = gql`
  mutation TogglePromotion($id: String!) {
    togglePromotion(promotionId: $id) {
      id
    }
  }
`;

export const CREATE_PROMOTION_MUTATION = gql`
  mutation CreatePromotion($title: String!, $pct: Float!, $desc: String) {
    createPromotion(title: $title, discountPercent: $pct, description: $desc) {
      id
    }
  }
`;

export const GET_REWARDS = gql`
  query GetRewards($activeOnly: Boolean) {
    rewards(activeOnly: $activeOnly) {
      id
      name
      description
      pointsCost
      isActive
      stock
    }
  }
`;

export const CREATE_REWARD_MUTATION = gql`
  mutation CreateReward(
    $name: String!
    $pts: Int!
    $stock: Int!
    $desc: String
  ) {
    createReward(
      name: $name
      pointsCost: $pts
      stock: $stock
      description: $desc
    ) {
      id
    }
  }
`;

export const UPDATE_REWARD_MUTATION = gql`
  mutation UpdateReward(
    $id: String!
    $name: String!
    $pts: Int!
    $stock: Int!
    $desc: String
  ) {
    updateReward(
      rewardId: $id
      name: $name
      pointsCost: $pts
      stock: $stock
      description: $desc
    ) {
      id
    }
  }
`;

export const TOGGLE_REWARD_MUTATION = gql`
  mutation ToggleReward($id: String!) {
    toggleReward(rewardId: $id) {
      id
    }
  }
`;

export const GET_TOTAL_ORDERS = gql`
  query GetTotalOrders($b: String) {
    totalOrders(branch: $b)
  }
`;

export const TOGGLE_DISH_STATUS_MUTATION = gql`
  mutation ToggleDishStatus($id: String!) {
    toggleDishStatus(id: $id) {
      id
      isActive
    }
  }
`;

export const REDEEM_POINTS_MUTATION = gql`
  mutation RedeemPoints($cid: String!, $rid: String!) {
    redeemPoints(customerId: $cid, rewardId: $rid) {
      success
      message
      remainingPoints
    }
  }
`;

export const GET_CART = gql`
  query GetCart($customerId: String!) {
    cart(customerId: $customerId) {
      customerId
      items {
        productId: productId
        name
        price
        quantity
        isReward: isReward
      }
    }
  }
`;

export const ADD_TO_CART = gql`
  mutation AddToCart($cid: String!, $pid: String!, $name: String!, $price: Float!, $qty: Int!, $reward: Boolean) {
    addItemToCart(customerId: $cid, productId: $pid, name: $name, price: $price, quantity: $qty, isReward: $reward) {
      customerId
      items {
        productId: productId
        name
        quantity
      }
    }
  }
`;

export const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($cid: String!, $pid: String!) {
    removeItemFromCart(customerId: $cid, productId: $pid) {
      customerId
      items {
        productId: productId
        name
      }
    }
  }
`;

export const UPDATE_CART_QTY = gql`
  mutation UpdateCartQty($cid: String!, $pid: String!, $qty: Int!) {
    updateCartItemQuantity(customerId: $cid, productId: $pid, quantity: $qty) {
      customerId
      items {
        productId: productId
        name
        quantity
      }
    }
  }
`;

export const CLEAR_CART = gql`
  mutation ClearCart($cid: String!) {
    clearCart(customerId: $cid)
  }
`;
