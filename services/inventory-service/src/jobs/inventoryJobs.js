import cron from "node-cron";
import db from "../database/knex.js";
import { publishMessage } from "../rabbitmq.js";

export function startInventoryJobs() {
  // ─── Cron 1: Lotes por vencer (cada noche a las 12:00 AM) ─────────
  cron.schedule("0 0 * * *", async () => {
    console.log("Cron: verificando lotes por vencer...");
    try {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + 3);

      const expiringBatches = await db("batches")
        .where("expiration_date", "<=", limitDate.toISOString().split("T")[0])
        .where({ status: "ACTIVO" });

      for (const batch of expiringBatches) {
        await publishMessage("inventory.alerts", {
          type: "BATCH_EXPIRING",
          batch_id: batch.id,
          ingredient_id: batch.ingredient_id,
          location_id: batch.location_id,
          expiration_date: batch.expiration_date,
          current_quantity: batch.current_quantity,
          unit: batch.unit,
        });
        console.log(` Lote ${batch.id} por vencer el ${batch.expiration_date}`);
      }
    } catch (error) {
      console.error("Error en cron de vencimientos:", error);
    }
  });

  // ─── Cron 2: Bajo stock (cada hora) ───────────────────────────────
  cron.schedule("0 * * * *", async () => {
    console.log("Cron: verificando bajo stock...");
    try {
      const configs = await db("low_stock_configs").where({ is_active: true });

      for (const config of configs) {
        const stock = await db("stocks")
          .where({
            ingredient_id: config.ingredient_id,
            location_id: config.location_id,
          })
          .first();

        if (!stock) continue;

        if (
          parseFloat(stock.total_quantity) <= parseFloat(config.min_threshold)
        ) {
          await publishMessage("inventory.alerts", {
            type: "LOW_STOCK",
            ingredient_id: config.ingredient_id,
            location_id: config.location_id,
            current_quantity: stock.total_quantity,
            min_threshold: config.min_threshold,
            unit: stock.unit,
          });
          console.log(
            ` Bajo stock: ingrediente ${config.ingredient_id} en sede ${config.location_id}`,
          );
        }
      }
    } catch (error) {
      console.error("Error en cron de bajo stock:", error);
    }
  });

  console.log("Cron jobs iniciados");
}
