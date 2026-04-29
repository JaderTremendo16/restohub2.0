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
  enum IngredientCategory {
    Frutas
    Verduras
    Proteinas
    Lacteos
    Cereales
    Bebidas
    Otros
  }

  type Supplier @key(fields: "id") {
    id: ID!
    name: String!
    phone: String
    email: String
    country_id: Int
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  type Ingredient @key(fields: "id") {
    id: ID!
    name: String!
    unit: Unit!
    category: IngredientCategory
    cost_per_unit: Float!
    supplier_id: ID
    supplier: Supplier
    location_id: Int
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  type Query {
    ingredients(onlyActive: Boolean, location_id: Int, strict: Boolean): [Ingredient!]!
    ingredient(id: ID!, location_id: Int): Ingredient
    suppliers(onlyActive: Boolean, country_id: Int): [Supplier!]!
    supplier(id: ID!): Supplier
    ingredientCosts(location_id: Int): [IngredientCost!]!
  }

  type IngredientCost {
    id: ID!
    ingredient_id: Int!
    location_id: Int!
    cost_per_unit: Float!
    supplier_id: Int
    created_at: String
    updated_at: String
  }

  type Mutation {
    createIngredient(input: CreateIngredientInput!): Ingredient!
    updateIngredient(id: ID!, input: UpdateIngredientInput!): Ingredient!
    deactivateIngredient(id: ID!, location_id: Int): Ingredient!
    activateIngredient(id: ID!, location_id: Int): Ingredient!

    createSupplier(input: CreateSupplierInput!): Supplier!
    updateSupplier(id: ID!, input: UpdateSupplierInput!): Supplier!
    deactivateSupplier(id: ID!): Supplier!
    activateSupplier(id: ID!): Supplier!
    upsertIngredientCost(input: UpsertIngredientCostInput!): IngredientCost!
  }

  input CreateIngredientInput {
    name: String!
    unit: Unit!
    category: IngredientCategory
    cost_per_unit: Float!
    supplier_id: Int
    location_id: Int
  }

  input UpdateIngredientInput {
    name: String
    unit: Unit
    category: IngredientCategory
    cost_per_unit: Float
    supplier_id: Int
    location_id: Int
    is_active: Boolean
  }

  input CreateSupplierInput {
    name: String!
    phone: String
    email: String
    country_id: Int
  }

  input UpdateSupplierInput {
    name: String
    phone: String
    email: String
    country_id: Int
  }

  input UpsertIngredientCostInput {
    ingredient_id: Int!
    location_id: Int!
    cost_per_unit: Float!
    supplier_id: Int
  }
`;
export default typeDefs;
