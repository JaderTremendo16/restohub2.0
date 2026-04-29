import database from "../database/knex.js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const resolvers = {
  Query: {
    dishes: async (_, { OnlyActive, location_id, onlyGlobal }) => {
      const query = database("dishes");
      if (OnlyActive) query.where({ "dishes.is_active": true });
      
      if (onlyGlobal) {
        query.whereNull("dishes.location_id");
      } else if (location_id) {
        query.where(function () {
          this.whereNull("dishes.location_id").orWhere({
            "dishes.location_id": parseInt(location_id),
          });
        });
      }

      query.leftJoin("dish_location_status as dls", function () {
        this.on("dls.dish_id", "=", "dishes.id");
        if (location_id) {
          this.andOn("dls.location_id", "=", database.raw("?", [location_id]));
        } else {
          this.andOn(database.raw("1 = 0"));
        }
      }).select("dishes.*", "dls.is_active as local_is_active");

      const results = await query;
      return results.map(dish => ({
        ...dish,
        is_active: dish.local_is_active !== null ? dish.local_is_active : dish.is_active
      }));
    },

    dish: async (_, { id }) => {
      return await database("dishes")
        .where({ id: parseInt(id) })
        .first();
    },

    DishIngredients: async (_, { dish_id }) => {
      return await database("dish_ingredient").where({
        dish_id: parseInt(dish_id),
      });
    },

    menuPrices: async (_, { dish_id, restaurant_id }) => {
      const query = database("menu_prices");
      if (dish_id) query.where({ dish_id: parseInt(dish_id) });
      if (restaurant_id)
        query.where({ restaurant_id: parseInt(restaurant_id) });
      return await query;
    },

    cloudinaryImages: async () => {
      try {
        if (!process.env.CLOUDINARY_API_KEY) {
          throw new Error("Cloudinary API credentials missing on backend");
        }
        // resources() returns recent uploaded files
        const result = await cloudinary.api.resources({
          type: 'upload',
          resource_type: 'image',
          max_results: 50
        });
        
        return result.resources.map(img => ({
          public_id: img.public_id,
          url: img.url,
          secure_url: img.secure_url
        }));
      } catch (error) {
        console.error("Error fetching Cloudinary images:", error);
        throw new Error("Failed to fetch images from Cloudinary");
      }
    },
  },

  Dish: {
    ingredients: async (parent) => {
      return await database("dish_ingredient").where({ dish_id: parent.id });
    },
    prices: async (parent) => {
      return await database("menu_prices").where({ dish_id: parent.id });
    },
    is_active: async (parent) => {
      if (parent.local_is_active !== undefined && parent.local_is_active !== null) {
        return parent.local_is_active;
      }
      if (parent.location_id) {
        const local = await database("dish_location_status")
          .where({
            dish_id: parent.id,
            location_id: parent.location_id,
          })
          .first();
        if (local) return local.is_active;
      }
      return parent.is_active;
    },
    created_at: (parent) =>
      parent.created_at ? new Date(parent.created_at).toISOString() : null,
    updated_at: (parent) =>
      parent.updated_at ? new Date(parent.updated_at).toISOString() : null,
  },
  Ingredient: {
    dishes: async (parent) => {
      // Retorna todos los platos que usan este ingrediente
      const dishIds = await database("dish_ingredient")
        .where({ ingredient_id: parent.id })
        .pluck("dish_id");

      if (dishIds.length === 0) return [];
      return await database("dishes").whereIn("id", dishIds);
    },
  },

  DishIngredient: {
    ingredient: (parent) => {
      return { __typename: "Ingredient", id: parent.ingredient_id };
    },
  },
  MenuPrice: {
    restaurant(menuPrice) {
      return menuPrice.restaurant_id
        ? { __typename: "Location", id: menuPrice.restaurant_id }
        : null;
    },
    valid_from: (parent) =>
      parent.valid_from ? new Date(parent.valid_from).toISOString() : null,
    valid_until: (parent) =>
      parent.valid_until ? new Date(parent.valid_until).toISOString() : null,
    created_at: (parent) =>
      parent.created_at ? new Date(parent.created_at).toISOString() : null,
    updated_at: (parent) =>
      parent.updated_at ? new Date(parent.updated_at).toISOString() : null,
  },

  Mutation: {
    createDish: async (_, { input }) => {
      const [dish] = await database("dishes").insert(input).returning("*");
      return dish;
    },

    updateDish: async (_, { id, input }) => {
      const [dish] = await database("dishes")
        .where({ id: parseInt(id) })
        .update({ ...input, updated_at: new Date() })
        .returning("*");
      return dish;
    },

    activateDish: async (_, { id, location_id }) => {
      if (location_id) {
        const existing = await database("dish_location_status")
          .where({ dish_id: parseInt(id), location_id: parseInt(location_id) })
          .first();
        if (existing) {
          await database("dish_location_status")
            .where({ id: existing.id })
            .update({ is_active: true, updated_at: new Date() });
        } else {
          await database("dish_location_status")
            .insert({ dish_id: parseInt(id), location_id: parseInt(location_id), is_active: true });
        }
        return await database("dishes").where({ id: parseInt(id) }).first();
      }

      const [dish] = await database("dishes")
        .where({ id: parseInt(id) })
        .update({ is_active: true, updated_at: new Date() })
        .returning("*");
      return dish;
    },

    deactivateDish: async (_, { id, location_id }) => {
      if (location_id) {
        const existing = await database("dish_location_status")
          .where({ dish_id: parseInt(id), location_id: parseInt(location_id) })
          .first();
        if (existing) {
          await database("dish_location_status")
            .where({ id: existing.id })
            .update({ is_active: false, updated_at: new Date() });
        } else {
          await database("dish_location_status")
            .insert({ dish_id: parseInt(id), location_id: parseInt(location_id), is_active: false });
        }
        return await database("dishes").where({ id: parseInt(id) }).first();
      }

      const [dish] = await database("dishes")
        .where({ id: parseInt(id) })
        .update({ is_active: false, updated_at: new Date() })
        .returning("*");
      return dish;
    },

    addDishIngredient: async (_, { input }) => {
      if (input.quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a cero");
      }
      const [dishIngredient] = await database("dish_ingredient")
        .insert(input)
        .returning("*");
      return dishIngredient;
    },

    updateDishIngredient: async (_, { id, quantity, unit }) => {
      if (quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a cero");
      }
      const [dishIngredient] = await database("dish_ingredient")
        .where({ id: parseInt(id) })
        .update({ quantity, unit })
        .returning("*");
      return dishIngredient;
    },

    removeDishIngredient: async (_, { id }) => {
      const deleted = await database("dish_ingredient")
        .where({ id: parseInt(id) })
        .delete();
      return deleted > 0;
    },

    createMenuPrice: async (_, { input }) => {
      const [price] = await database("menu_prices")
        .insert(input)
        .returning("*");
      return price;
    },

    updateMenuPrice: async (_, { id, input }) => {
      const [price] = await database("menu_prices")
        .where({ id: parseInt(id) })
        .update({ ...input, updated_at: new Date() })
        .returning("*");
      return price;
    },

    deleteCloudinaryImage: async (_, { public_id }) => {
      try {
        if (!process.env.CLOUDINARY_API_KEY) {
          throw new Error("Cloudinary API credentials missing on backend");
        }
        await cloudinary.uploader.destroy(public_id);
        return true;
      } catch (error) {
        console.error("Error deleting Cloudinary image:", error);
        throw new Error("Failed to delete image from Cloudinary");
      }
    },
  },
};


export default resolvers;
