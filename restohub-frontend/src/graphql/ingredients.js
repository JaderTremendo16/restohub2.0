import { gql } from "@apollo/client/core";

// ─── QUERIES ────────────────────────────────────────────────────

// Trae todos los ingredientes. Si onlyActive es true, solo los activos.
export const GET_INGREDIENTS = gql`
  query GetIngredients($onlyActive: Boolean, $location_id: Int, $strict: Boolean) {
    ingredients(onlyActive: $onlyActive, location_id: $location_id, strict: $strict) {
      id
      name
      unit
      category
      cost_per_unit
      supplier_id
      location_id
      is_active
      dishes {
        id
        name
      }
    }
  }
`;

// Trae un ingrediente específico por su ID
export const GET_INGREDIENT = gql`
  query GetIngredient($id: ID!) {
    ingredient(id: $id) {
      id
      name
      unit
      category
      cost_per_unit
      supplier_id
      is_active
    }
  }
`;

// Trae todos los proveedores
export const GET_SUPPLIERS = gql`
  query GetSuppliers($onlyActive: Boolean, $country_id: Int) {
    suppliers(onlyActive: $onlyActive, country_id: $country_id) {
      id
      name
      phone
      email
      country_id
      is_active
    }
  }
`;

// Trae un proveedor específico por su ID
export const GET_SUPPLIER = gql`
  query GetSupplier($id: ID!) {
    supplier(id: $id) {
      id
      name
      phone
      email
      country_id
      is_active
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────

// CREATE — cambia IngredientInput por CreateIngredientInput
export const CREATE_INGREDIENT = gql`
  mutation CreateIngredient($input: CreateIngredientInput!) {
    createIngredient(input: $input) {
      id
      name
      unit
      category
      cost_per_unit
      supplier_id
      location_id
      is_active
    }
  }
`;

// UPDATE — cambia IngredientInput por UpdateIngredientInput
export const UPDATE_INGREDIENT = gql`
  mutation UpdateIngredient($id: ID!, $input: UpdateIngredientInput!) {
    updateIngredient(id: $id, input: $input) {
      id
      name
      unit
      category
      cost_per_unit
      supplier_id
      location_id
      is_active
    }
  }
`;
// Desactiva un ingrediente (no lo borra, solo lo marca como inactivo)
export const DEACTIVATE_INGREDIENT = gql`
  mutation DeactivateIngredient($id: ID!, $location_id: Int) {
    deactivateIngredient(id: $id, location_id: $location_id) {
      id
      is_active
    }
  }
`;
export const ACTIVATE_INGREDIENT = gql`
  mutation ActivateIngredient($id: ID!, $location_id: Int) {
    activateIngredient(id: $id, location_id: $location_id) {
      id
      is_active
    }
  }
`;

// Crea un nuevo proveedor
export const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($input: CreateSupplierInput!) {
    createSupplier(input: $input) {
      id
      name
      phone
      email
      country_id
      is_active
    }
  }
`;

// Edita un proveedor existente
export const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($id: ID!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
      name
      phone
      email
      country_id
      is_active
    }
  }
`;

export const ACTIVATE_SUPPLIER = gql`
  mutation ActivateSupplier($id: ID!) {
    activateSupplier(id: $id) {
      id
      is_active
    }
  }
`;

// Desactiva un proveedor
export const DEACTIVATE_SUPPLIER = gql`
  mutation DeactivateSupplier($id: ID!) {
    deactivateSupplier(id: $id) {
      id
      is_active
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
      supplier_id
    }
  }
`;
