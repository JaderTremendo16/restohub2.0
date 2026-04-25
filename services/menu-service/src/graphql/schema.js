import gql from "graphql-tag";

const typeDefs = gql`
  enum DishCategory {
    entrada
    sopa
    principal
    postre
    bebida
  }

  enum Unit {
    kg
    g
    l
    L
    ml
    unidad
  }
  extend type Location @key(fields: "id") {
    id: ID! @external
    name: String! @external
  }

  type Dish {
    id: ID!
    name: String!
    description: String
    category: DishCategory!
    is_active: Boolean!
    location_id: Int
    image_url: String
    ingredients: [DishIngredient!]!
    prices: [MenuPrice!]!
    created_at: String
    updated_at: String
  }

  type DishIngredient {
    id: ID!
    dish_id: Int!
    ingredient_id: Int!
    ingredient: Ingredient @provides(fields: "name")
    quantity: Float!
    unit: Unit!
  }
  extend type Ingredient @key(fields: "id") {
    id: ID! @external
    name: String! @external
    is_active: Boolean @external
    dishes: [Dish!]!
  }

  type MenuPrice {
    id: ID!
    dish_id: Int!
    restaurant_id: Int!
    restaurant: Location @provides(fields: "id")
    price: Float!
    profit_margin: Float
    valid_from: String!
    valid_until: String
    created_at: String
    updated_at: String
  }


  type Query {
    dishes(OnlyActive: Boolean, location_id: Int, onlyGlobal: Boolean): [Dish!]!
    dish(id: ID!): Dish
    DishIngredients(dish_id: ID!): [DishIngredient!]!
    menuPrices(dish_id: ID!): [MenuPrice!]!
  }

  type Mutation {
    createDish(input: CreateDishInput!): Dish!
    updateDish(id: ID!, input: UpdateDishInput!, location_id: Int): Dish!
    activateDish(id: ID!, location_id: Int): Dish!
    deactivateDish(id: ID!, location_id: Int): Dish!

    addDishIngredient(input: AddDishIngredientInput!): DishIngredient!
    updateDishIngredient(id: ID!, quantity: Float!, unit: Unit!): DishIngredient!
    removeDishIngredient(id: ID!): Boolean!

    createMenuPrice(input: CreateMenuPriceInput!): MenuPrice!
    updateMenuPrice(id: ID!, input: UpdateMenuPriceInput!): MenuPrice!
  }

  input CreateDishInput {
    name: String!
    description: String
    category: DishCategory!
    location_id: Int
    image_url: String
  }

  input UpdateDishInput {
    name: String
    description: String
    category: DishCategory
    location_id: Int
    is_active: Boolean
    image_url: String
  }

  input AddDishIngredientInput {
    dish_id: Int!
    ingredient_id: Int!
    quantity: Float!
    unit: Unit!
  }

  input CreateMenuPriceInput {
    dish_id: Int!
    price: Float!
    restaurant_id: Int!
    profit_margin: Float!
    valid_from: String!
    valid_until: String
  }

  input UpdateMenuPriceInput {
    price: Float
    profit_margin: Float
    valid_from: String
    valid_until: String
  }
`;

export default typeDefs;
