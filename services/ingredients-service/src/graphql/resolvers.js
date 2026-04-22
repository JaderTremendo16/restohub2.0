// resolvers.js: Son las funciones que ejecutan la lógica de cada query y mutation definindas en el schema.js.

// database: Es la instancia de knex.js que se conecta a la base de datos.
import database from "../database/knex.js";

// Aqui contiene las consultas y mutaciones que se pueden realizar en la base de datos.
const resolvers = {
  Query: {
    // async = Esto indica que la función es asíncrona, es decir, que se puede ejecutar en segundo plano.
    ingredients: async (_, { onlyActive, location_id, strict }) => {
      const query = database("ingredients as i")
        .select("i.*")
        .leftJoin("ingredient_costs as ic", function () {
          this.on("ic.ingredient_id", "=", "i.id");
          if (location_id) {
            this.andOn("ic.location_id", "=", database.raw("?", [location_id]));
          } else {
            this.andOn(database.raw("1 = 0"));
          }
        })
        .leftJoin("ingredient_location_status as ils", function () {
          this.on("ils.ingredient_id", "=", "i.id");
          if (location_id) {
            this.andOn("ils.location_id", "=", database.raw("?", [location_id]));
          } else {
            this.andOn(database.raw("1 = 0"));
          }
        })
        .select("ils.is_active as local_is_active", "ils.unit as local_unit")
        .select("ic.cost_per_unit as local_cost")
        .select("ic.supplier_id as local_supplier_id");

      if (onlyActive) query.where({ "i.is_active": true });
      if (location_id) {
        if (strict) {
          query.where({ "i.location_id": parseInt(location_id) });
        } else {
          query.where(function () {
            this.whereNull("i.location_id").orWhere({
              "i.location_id": parseInt(location_id),
            });
          });
        }
      }

      const results = await query;
      return results.map((ing) => ({
        ...ing,
        cost_per_unit:
          ing.local_cost !== null ? ing.local_cost : ing.cost_per_unit,
        supplier_id:
          ing.local_supplier_id !== null
            ? ing.local_supplier_id
            : ing.supplier_id,
        is_active: 
          ing.local_is_active !== null ? ing.local_is_active : ing.is_active,
        unit: ing.local_unit || ing.unit
      }));
    },

    ingredient: async (_, { id, location_id }) => {
      const query = database("ingredients as i")
        .select("i.*")
        .select("ic.cost_per_unit as local_cost")
        .select("ic.supplier_id as local_supplier_id")
        .leftJoin("ingredient_costs as ic", function () {
          this.on("ic.ingredient_id", "=", "i.id");
          if (location_id) {
            this.andOn("ic.location_id", "=", database.raw("?", [location_id]));
          } else {
             this.andOn(database.raw("1 = 0"));
          }
        })
        .leftJoin("ingredient_location_status as ils", function () {
          this.on("ils.ingredient_id", "=", "i.id");
          if (location_id) {
            this.andOn("ils.location_id", "=", database.raw("?", [location_id]));
          } else {
            this.andOn(database.raw("1 = 0"));
          }
        })
        .select("ils.is_active as local_is_active", "ils.unit as local_unit")
        .where("i.id", id)
        .first();

      const result = await query;
      if (!result) return null;

      return {
        ...result,
        cost_per_unit:
          result.local_cost !== null ? result.local_cost : result.cost_per_unit,
        supplier_id:
          result.local_supplier_id !== null
            ? result.local_supplier_id
            : result.supplier_id,
        is_active: 
          result.local_is_active !== null ? result.local_is_active : result.is_active,
        unit: result.local_unit || result.unit
      };
    },

    suppliers: async (_, { onlyActive, country_id }) => {
      const query = database("suppliers");
      if (onlyActive) query.where({ is_active: true });
      if (country_id) query.where({ country_id: parseInt(country_id) });
      return await query;
    },

    supplier: async (_, { id }) => {
      return await database("suppliers").where({ id }).first();
    },

    ingredientCosts: async (_, { location_id }) => {
      const query = database("ingredient_costs");
      if (location_id) query.where({ location_id: parseInt(location_id) });
      return await query;
    },
  },

  // Ingredient y Supplier: Estos sirven para que el Gateway sepa como unir los datos o encontrar las referencias.
  Ingredient: {
    supplier: async (parent) => {
      if (!parent.supplier_id) return null;
      return await database("suppliers")
        .where({ id: parent.supplier_id })
        .first();
    },
    // Resolver dinámico para el costo: intenta buscar el costo local/país antes de devolver el global
    cost_per_unit: async (parent) => {
      if (parent.location_id) {
        const local = await database("ingredient_costs")
          .where({
            ingredient_id: parent.id,
            location_id: parent.location_id,
          })
          .first();
        if (local) return local.cost_per_unit;
      }
      return parent.cost_per_unit;
    },
    unit: (parent) => {
      if (parent.local_unit) return parent.local_unit;
      return parent.unit;
    },
    is_active: async (parent) => {
      if (parent.location_id) {
         const local = await database("ingredient_location_status")
          .where({
            ingredient_id: parent.id,
            location_id: parent.location_id,
          })
          .first();
        if (local) return local.is_active;
      }
      return parent.is_active;
    },
    // Esto es para que Apollo Federation encuentre un ingrediente por su ID desde otros servicios
    __resolveReference: async (reference) => {
      return await database("ingredients").where({ id: reference.id }).first();
    },
    // Formateo de fechas para evitar milisegundos
    created_at: (parent) =>
      parent.created_at ? new Date(parent.created_at).toISOString() : null,
    updated_at: (parent) =>
      parent.updated_at ? new Date(parent.updated_at).toISOString() : null,
  },

  Supplier: {
    // Lo mismo, permite que otros microservicios busquen al proveedor por su ID
    __resolveReference: async (reference) => {
      return await database("suppliers").where({ id: reference.id }).first();
    },
    country(supplier) {
      return { __typename: "Country", id: supplier.country_id };
    },
    // Formateo de fechas y corrección de "update_at" a "updated_at"
    created_at: (parent) =>
      parent.created_at ? new Date(parent.created_at).toISOString() : null,
    updated_at: (parent) =>
      parent.updated_at ? new Date(parent.updated_at).toISOString() : null,
  },

  Mutation: {
    //Aqui hacemos el tipico CRUD (Create, Read, Update, Delete) tanto para ingredientes como para proveedores.
    createIngredient: async (_, { input }) => {
      const [ingredient] = await database("ingredients")
        .insert(input)
        .returning("*");
      return ingredient;
    },

    updateIngredient: async (_, { id, input }) => {
      // Si el input trae location_id, guardamos los cambios (unit, is_active)
      // en la tabla de estado local en lugar de tocar el ingrediente global.
      if (input.location_id) {
        const updateData = { updated_at: new Date() };
        if (input.is_active !== undefined) updateData.is_active = input.is_active;
        if (input.unit !== undefined) updateData.unit = input.unit;

        const existing = await database("ingredient_location_status")
          .where({ 
            ingredient_id: parseInt(id), 
            location_id: parseInt(input.location_id) 
          })
          .first();

        if (existing) {
          await database("ingredient_location_status")
            .where({ id: existing.id })
            .update(updateData);
        } else {
          await database("ingredient_location_status").insert({
            ingredient_id: parseInt(id),
            location_id: parseInt(input.location_id),
            ...updateData
          });
        }

        // Si se envió categoría o nombre, eso es global (se actualiza en la tabla base)
        if (input.category || input.name) {
          const globalUpdate = {};
          if (input.category) globalUpdate.category = input.category;
          if (input.name) globalUpdate.name = input.name;
          
          await database("ingredients")
            .where({ id: parseInt(id) })
            .update(globalUpdate);
        }

        return await database("ingredients").where({ id: parseInt(id) }).first();
      }

      // Si no hay location_id, es un cambio global (solo Gerente General debería hacer esto)
      const [ingredient] = await database("ingredients")
        .where({ id: parseInt(id) })
        .update({ ...input, updated_at: new Date() })
        .returning("*");
      return ingredient;
    },

    deactivateIngredient: async (_, { id, location_id }) => {
      if (location_id) {
        // Upsert en la tabla de estado por sede
        const existing = await database("ingredient_location_status")
          .where({ ingredient_id: parseInt(id), location_id: parseInt(location_id) })
          .first();
        
        if (existing) {
          await database("ingredient_location_status")
            .where({ id: existing.id })
            .update({ is_active: false, updated_at: new Date() });
        } else {
          await database("ingredient_location_status")
            .insert({ ingredient_id: parseInt(id), location_id: parseInt(location_id), is_active: false });
        }
        return await database("ingredients").where({ id: parseInt(id) }).first();
      }

      const [ingredient] = await database("ingredients")
        .where({ id: parseInt(id) })
        .update({ is_active: false, updated_at: new Date() })
        .returning("*");
      return ingredient;
    },

    activateIngredient: async (_, { id, location_id }) => {
      if (location_id) {
        // Upsert en la tabla de estado por sede
        const existing = await database("ingredient_location_status")
          .where({ ingredient_id: parseInt(id), location_id: parseInt(location_id) })
          .first();
        
        if (existing) {
          await database("ingredient_location_status")
            .where({ id: existing.id })
            .update({ is_active: true, updated_at: new Date() });
        } else {
          await database("ingredient_location_status")
            .insert({ ingredient_id: parseInt(id), location_id: parseInt(location_id), is_active: true });
        }
        return await database("ingredients").where({ id: parseInt(id) }).first();
      }

      const [ingredient] = await database("ingredients")
        .where({ id: parseInt(id) })
        .update({ is_active: true, updated_at: new Date() })
        .returning("*");
      return ingredient;
    },

    createSupplier: async (_, { input }) => {
      const [supplier] = await database("suppliers")
        .insert(input)
        .returning("*");
      return supplier;
    },

    updateSupplier: async (_, { id, input }) => {
      const [supplier] = await database("suppliers")
        .where({ id: parseInt(id) })
        .update({ ...input, updated_at: new Date() })
        .returning("*");
      return supplier;
    },

    activateSupplier: async (_, { id }) => {
      const [supplier] = await database("suppliers")
        .where({ id: parseInt(id) })
        .update({ is_active: true, updated_at: new Date() })
        .returning("*");
      return supplier;
    },

    deactivateSupplier: async (_, { id }) => {
      const [supplier] = await database("suppliers")
        .where({ id: parseInt(id) })
        .update({ is_active: false, updated_at: new Date() })
        .returning("*");
      return supplier;
    },

    upsertIngredientCost: async (_, { input }) => {
      const existing = await database("ingredient_costs")
        .where({
          ingredient_id: input.ingredient_id,
          location_id: input.location_id,
        })
        .first();

      if (existing) {
        const [updated] = await database("ingredient_costs")
          .where({ id: existing.id })
          .update({ ...input, updated_at: new Date() })
          .returning("*");
        return updated;
      } else {
        const [created] = await database("ingredient_costs")
          .insert(input)
          .returning("*");
        return created;
      }
    },
  },
};

export default resolvers;
