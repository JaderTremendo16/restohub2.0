import { gql } from "@apollo/client/core";

// ─────────────────────────────────────────────────────────────────────────────
// RestoHub — Loyalty & Customer GraphQL Operations
// Todos los resolvers del customer-service usan el nombre `customers`
// (renombrado desde `users` para evitar colisión con location-service).
// ─────────────────────────────────────────────────────────────────────────────


// ── Customer queries ──────────────────────────────────────────────────────────

/**
 * Lista de clientes, opcionalmente filtrada por sede.
 * Resolver: customers (renombrado desde `users`)
 */
export const GET_CUSTOMERS = gql`
  query GetCustomers($branch: String) {
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

/** Alias para componentes que aún importan GET_USERS */
export const GET_USERS = GET_CUSTOMERS;


// ── Loyalty account queries ───────────────────────────────────────────────────

/**
 * Cuenta de lealtad de un cliente específico.
 * Resolver: loyaltyAccount
 */
export const GET_LOYALTY_ACCOUNT = gql`
  query GetLoyaltyAccount($customerId: String!) {
    loyaltyAccount(customerId: $customerId) {
      totalPoints
      tier
    }
  }
`;

/**
 * Todas las cuentas de lealtad (vista admin).
 * Resolver: allLoyaltyAccounts
 */
export const GET_ALL_LOYALTY_ACCOUNTS = gql`
  query GetAllLoyaltyAccounts {
    allLoyaltyAccounts {
      customerId
      totalPoints
      tier
    }
  }
`;

/**
 * Historial de puntos de un cliente (más reciente primero).
 * Resolver: pointHistory
 */
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


// ── Promotions ────────────────────────────────────────────────────────────────

/**
 * Lista de promociones. Filtros opcionales: activeOnly, branch.
 * Resolver: promotions
 */
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

export const CREATE_PROMOTION_MUTATION = gql`
  mutation CreatePromotion($title: String!, $pct: Float!, $desc: String, $branch: String) {
    createPromotion(title: $title, discountPercent: $pct, description: $desc, branch: $branch) {
      id
      title
      isActive
    }
  }
`;

export const TOGGLE_PROMOTION_MUTATION = gql`
  mutation TogglePromotion($id: String!) {
    togglePromotion(promotionId: $id) {
      id
      isActive
    }
  }
`;


// ── Rewards ───────────────────────────────────────────────────────────────────

/**
 * Catálogo de premios canjeables.
 * Resolver: rewards
 */
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
  mutation CreateReward($name: String!, $pts: Int!, $stock: Int!, $desc: String) {
    createReward(name: $name, pointsCost: $pts, stock: $stock, description: $desc) {
      id
      name
      pointsCost
      stock
    }
  }
`;

export const UPDATE_REWARD_MUTATION = gql`
  mutation UpdateReward($id: String!, $name: String!, $pts: Int!, $stock: Int!, $desc: String) {
    updateReward(rewardId: $id, name: $name, pointsCost: $pts, stock: $stock, description: $desc) {
      id
      name
      pointsCost
      stock
    }
  }
`;

export const TOGGLE_REWARD_MUTATION = gql`
  mutation ToggleReward($id: String!) {
    toggleReward(rewardId: $id) {
      id
      isActive
    }
  }
`;

/**
 * El cliente canjea un premio.
 * Resolver: redeemPoints
 */
export const REDEEM_POINTS_MUTATION = gql`
  mutation RedeemPoints($customerId: String!, $rewardId: String!) {
    redeemPoints(customerId: $customerId, rewardId: $rewardId) {
      success
      message
      remainingPoints
    }
  }
`;


// ── Ratings ───────────────────────────────────────────────────────────────────

/**
 * Todas las calificaciones, opcionalmente filtradas por sede.
 * Resolver: allRatings
 */
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