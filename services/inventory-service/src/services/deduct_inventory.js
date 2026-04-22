import database from "../database/knex.js";

/**
 * Descuenta inventario POR SEDE cuando se entrega un pedido.
 * 
 * Flujo:
 * 1. Consultar ingredientes del plato en menu-service (receta).
 * 2. Por cada ingrediente, restar de la tabla `stocks` filtrando por
 *    ingredient_id + location_id (sede).
 * 3. Registrar un log de SALIDA en inventory_logs.
 */
export async function processInventoryDeduction(eventData) {
  const { order_id, restaurant_id, items } = eventData;

  if (!items || items.length === 0) {
    console.log(`[Inventory] Orden ${order_id} sin items, sin descuento.`);
    return;
  }

  // El restaurant_id en los eventos puede ser un ID numérico o el nombre de la sede (string)
  let locationId = parseInt(restaurant_id);

  if (isNaN(locationId)) {
    console.log(`[Inventory] restaurant_id no es numérico ("${restaurant_id}"). Intentando resolver ID vía location-service...`);
    try {
      const locationUrl = process.env.LOCATION_SERVICE_URL || "http://location_service:4005/graphql";
      const locQuery = `
        query {
          locations {
            id
            name
          }
        }
      `;
      const locRes = await fetch(locationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: locQuery }),
      });
      const locData = await locRes.json();
      const locations = locData?.data?.locations || [];
      
      // Buscar coincidencia por nombre (ignorando espacios y mayúsculas)
      const found = locations.find(l => 
        l.name.trim().toLowerCase() === restaurant_id.trim().toLowerCase()
      );

      if (found) {
        locationId = parseInt(found.id);
        console.log(`[Inventory] Sede reconocida: "${restaurant_id}" => ID ${locationId}`);
      } else {
        console.warn(`[Inventory] No se pudo encontrar una sede con el nombre "${restaurant_id}".`);
        return;
      }
    } catch (err) {
      console.error(`[Inventory] Error consultando location-service:`, err.message);
      return;
    }
  }

  console.log(`[Inventory] Procesando descuento de inventario para orden ${order_id} → sede ${locationId}`);

  for (const item of items) {
    if (!item.product_id) {
      console.warn(`[Inventory] Item sin product_id en orden ${order_id}, saltando.`);
      continue;
    }

    try {
      // 1. Consultar receta del plato en menu-service
      const menuUrl = process.env.MENU_SERVICE_URL || "http://menu-service:4002/graphql";
      const query = `
        query GetDishIngredients($dish_id: ID!) {
          DishIngredients(dish_id: $dish_id) {
            ingredient_id
            quantity
            unit
          }
        }
      `;

      const response = await fetch(menuUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { dish_id: String(item.product_id) } }),
      });

      if (!response.ok) {
        console.error(`[Inventory] Error HTTP ${response.status} consultando menu-service.`);
        continue;
      }

      const { data, errors } = await response.json();

      if (errors?.length) {
        console.error(`[Inventory] GraphQL error al consultar receta de ${item.product_id}:`, errors);
        continue;
      }

      const receta = data?.DishIngredients ?? [];

      if (receta.length === 0) {
        console.log(`[Inventory] Plato ${item.product_id} sin ingredientes en receta, no se descuenta.`);
        continue;
      }

        // 2. Descontar cada ingrediente de la receta por la cantidad del pedido
        for (const recipeIngredient of receta) {
          const recipeQty = Number(recipeIngredient.quantity);
          const recipeUnit = recipeIngredient.unit;
          const orderQty = Number(item.quantity);
          
          const ingredientId = parseInt(recipeIngredient.ingredient_id);

          // Buscar stock existente en esta SEDE específica
          const stockRow = await database("stocks")
            .where({ ingredient_id: ingredientId, location_id: locationId })
            .first();

          if (!stockRow) {
            console.warn(
              `[Inventory] Sin stock del ingrediente ${ingredientId} en sede ${locationId}. No se puede descontar.`
            );
            continue;
          }

          // LÓGICA DE CONVERSIÓN DE UNIDADES (Consistencia con Frontend)
          let unitMultiplier = 1;
          if ((recipeUnit === 'g' || recipeUnit === 'ml') && (stockRow.unit === 'kg' || stockRow.unit === 'L')) {
            unitMultiplier = 0.001; // Dividir por 1000
          }

          const totalDeduction = recipeQty * orderQty * unitMultiplier;
          const currentQty = Number(stockRow.total_quantity);
          
          // FRENO EN 0: No permitir stock negativo
          const newQty = Math.max(0, currentQty - totalDeduction);

          console.log(`[Inventory] Deducción: ${recipeQty}${recipeUnit} x ${orderQty} platos. Multiplicador: ${unitMultiplier}. Total: ${totalDeduction}${stockRow.unit}`);

          // Actualizar el stock de la sede
          await database("stocks")
            .where({ id: stockRow.id })
            .update({ total_quantity: newQty, updated_at: new Date() });

          // 3. Registrar log de SALIDA con la unidad del stock
          await database("inventory_logs").insert({
            ingredient_id: ingredientId,
            location_id: locationId,
            type: "SALIDA",
            quantity: totalDeduction,
            unit: stockRow.unit,
            reason: `Pedido POS entregado #${order_id}`,
            reference_id: null,
            created_at: new Date(),
          });

          console.log(
            `[Inventory] ✅ Sede ${locationId} | Ingrediente ${ingredientId}: ${currentQty} → ${newQty} ${stockRow.unit}`
          );
        }
    } catch (err) {
      console.error(
        `[Inventory] Error procesando ingredientes del plato ${item.product_id}:`,
        err.message
      );
    }
  }

  console.log(`[Inventory] ✅ Descuento completado para orden ${order_id}`);
}
