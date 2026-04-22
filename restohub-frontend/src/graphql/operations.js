import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      message
      user { 
        id name email phone role preferences 
        country city branch 
      }
    }
  }
`;

export const GET_LOCATIONS = gql`
  query GetLocations {
    locations {
      id name address countryId
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $phone: String, $country: String, $city: String, $branch: String) {
    createUser(name: $name, email: $email, password: $password, phone: $phone, country: $country, city: $city, branch: $branch) {
      id
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($id: String!, $name: String!, $email: String!, $phone: String, $country: String, $city: String, $branch: String) {
    updateUserProfile(id: $id, name: $name, email: $email, phone: $phone, country: $country, city: $city, branch: $branch) {
      id name email phone country city branch
    }
  }
`;

export const GET_DISHES = gql`
  query GetDishes($activeOnly: Boolean, $branch: String) {
    dishes(activeOnly: $activeOnly, branch: $branch) {
      id name price emoji description category isActive branch
      ingredients {
        id
        ingredient {
          id
          is_active
        }
      }
    }
  }
`;

export const COMPLETE_ORDER_MUTATION = gql`
  mutation CompleteOrder($cid: String!, $items: String!, $total: Float!, $branch: String!) {
    completeOrder(customerId: $cid, items: $items, totalPrice: $total, branch: $branch)
  }
`;

export const GET_ALL_RATINGS = gql`
  query GetAllRatings($branch: String) {
    allRatings(branch: $branch) {
      id itemName stars comment createdAt customerId customerName
    }
  }
`;

export const GET_RATING_FOR_DISH = gql`
  query GetRatingForDish($cid: String!, $itemName: String!) {
    ratingForDish(customerId: $cid, itemName: $itemName) {
      id stars comment
    }
  }
`;

export const CREATE_RATING_MUTATION = gql`
  mutation CreateRating($cid: String!, $item: String!, $stars: Int!, $comment: String) {
    createRating(customerId: $cid, itemName: $item, stars: $stars, comment: $comment) {
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
    orders(customerId: $cid) {
      id items totalPrice branch createdAt
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($b: String) {
    users(branch: $b) {
      id name email phone role country city branch
    }
  }
`;

export const GET_LOYALTY_ACCOUNT = gql`
  query GetLoyaltyAccount($customerId: String!) {
    loyaltyAccount(customerId: $customerId) {
      totalPoints tier
    }
  }
`;

export const GET_ALL_LOYALTY_ACCOUNTS = gql`
  query GetAllLoyaltyAccounts {
    allLoyaltyAccounts {
      customerId totalPoints tier
    }
  }
`;

export const GET_POINT_HISTORY = gql`
  query GetPointHistory($customerId: String!) {
    pointHistory(customerId: $customerId) {
      actionType points description createdAt
    }
  }
`;

export const GET_PROMOTIONS = gql`
  query GetPromotions($activeOnly: Boolean, $branch: String) {
    promotions(activeOnly: $activeOnly, branch: $branch) {
      id title description discountPercent isActive branch
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
      id name description pointsCost isActive stock
    }
  }
`;

export const CREATE_REWARD_MUTATION = gql`
  mutation CreateReward($name: String!, $pts: Int!, $stock: Int!, $desc: String) {
    createReward(name: $name, pointsCost: $pts, stock: $stock, description: $desc) {
      id
    }
  }
`;

export const UPDATE_REWARD_MUTATION = gql`
  mutation UpdateReward($id: String!, $name: String!, $pts: Int!, $stock: Int!, $desc: String) {
    updateReward(rewardId: $id, name: $name, pointsCost: $pts, stock: $stock, description: $desc) {
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
      id isActive
    }
  }
`;

export const REDEEM_POINTS_MUTATION = gql`
  mutation RedeemPoints($cid: String!, $rid: String!) {
    redeemPoints(customerId: $cid, rewardId: $rid) {
      success message remainingPoints
    }
  }
`;
