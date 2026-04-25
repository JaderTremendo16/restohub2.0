import { gql } from "@apollo/client/core";

export const GET_DISHES = gql`
  query GetDishes($OnlyActive: Boolean, $location_id: Int, $onlyGlobal: Boolean) {
    dishes(OnlyActive: $OnlyActive, location_id: $location_id, onlyGlobal: $onlyGlobal) {
      id
      name
      description
      category
      location_id
      is_active
      image_url
      ingredients {
        id
        ingredient {
          id
          is_active
        }
      }
      prices {
        id
        restaurant_id
        price
        profit_margin
        valid_from
      }
    }
  }
`;

export const GET_DISH = gql`
  query GetDish($id: ID!) {
    dish(id: $id) {
      id
      name
      description
      category
      is_active
      image_url
    }
  }
`;

export const GET_DISH_INGREDIENTS = gql`
  query GetDishIngredients($dish_id: ID!) {
    DishIngredients(dish_id: $dish_id) {
      id
      dish_id
      ingredient_id
      quantity
      unit
    }
  }
`;

export const GET_MENU_PRICES = gql`
  query GetMenuPrices($dish_id: ID!) {
    menuPrices(dish_id: $dish_id) {
      id
      dish_id
      restaurant_id
      price
      valid_from
      valid_until
    }
  }
`;

export const CREATE_DISH = gql`
  mutation CreateDish($input: CreateDishInput!) {
    createDish(input: $input) {
      id
      name
      description
      category
      is_active
      image_url
    }
  }
`;

export const UPDATE_DISH = gql`
  mutation UpdateDish($id: ID!, $input: UpdateDishInput!) {
    updateDish(id: $id, input: $input) {
      id
      name
      description
      category
      location_id
      is_active
      image_url
    }
  }
`;

export const DEACTIVATE_DISH = gql`
  mutation DeactivateDish($id: ID!, $location_id: Int) {
    deactivateDish(id: $id, location_id: $location_id) {
      id
      is_active
    }
  }
`;

export const ACTIVATE_DISH = gql`
  mutation ActivateDish($id: ID!, $location_id: Int) {
    activateDish(id: $id, location_id: $location_id) {
      id
      is_active
    }
  }
`;

export const ADD_DISH_INGREDIENT = gql`
  mutation AddDishIngredient($input: AddDishIngredientInput!) {
    addDishIngredient(input: $input) {
      id
      dish_id
      ingredient_id
      quantity
      unit
    }
  }
`;

export const REMOVE_DISH_INGREDIENT = gql`
  mutation RemoveDishIngredient($id: ID!) {
    removeDishIngredient(id: $id)
  }
`;

export const UPDATE_DISH_INGREDIENT = gql`
  mutation UpdateDishIngredient($id: ID!, $quantity: Float!, $unit: Unit!) {
    updateDishIngredient(id: $id, quantity: $quantity, unit: $unit) {
      id
      dish_id
      ingredient_id
      quantity
      unit
    }
  }
`;

export const CREATE_MENU_PRICE = gql`
  mutation CreateMenuPrice($input: CreateMenuPriceInput!) {
    createMenuPrice(input: $input) {
      id
      dish_id
      restaurant_id
      price
      valid_from
      valid_until
    }
  }
`;

export const UPDATE_MENU_PRICE = gql`
  mutation UpdateMenuPrice($id: ID!, $input: UpdateMenuPriceInput!) {
    updateMenuPrice(id: $id, input: $input) {
      id
      dish_id
      restaurant_id
      price
      profit_margin
      valid_from
    }
  }
`;

export const GET_INGREDIENT_COSTS = gql`
  query GetIngredientCosts($location_id: Int, $country_id: Int) {
    ingredientCosts(location_id: $location_id, country_id: $country_id) {
      id
      ingredient_id
      location_id
      cost_per_unit
      supplier_id
    }
  }
`;

export const UPSERT_INGREDIENT_COST = gql`
  mutation UpsertIngredientCost($input: UpsertIngredientCostInput!) {
    upsertIngredientCost(input: $input) {
      id
      ingredient_id
      location_id
      cost_per_unit
    }
  }
`;

export const GET_CLOUDINARY_IMAGES = gql`
  query GetCloudinaryImages {
    cloudinaryImages {
      public_id
      url
      secure_url
    }
  }
`;

export const DELETE_CLOUDINARY_IMAGE = gql`
  mutation DeleteCloudinaryImage($public_id: String!) {
    deleteCloudinaryImage(public_id: $public_id)
  }
`;
