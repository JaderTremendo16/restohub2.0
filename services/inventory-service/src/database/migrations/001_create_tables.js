export async function up(knex) {
  await knex.schema.createTable("supply_orders", (table) => {
    table.increments("id").primary();
    table.integer("supplier_id").notNullable();
    table.integer("location_id").notNullable();
    table
      .enu("status", ["PENDIENTE", "RECIBIDO", "CANCELADO"])
      .defaultTo("PENDIENTE");
    table.decimal("total_cost", 10, 2).notNullable();
    table.date("order_date").defaultTo(knex.fn.now()).notNullable();
    table.date("received_date");
    table.text("notes");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("supply_order_items", (table) => {
    table.increments("id").primary();
    table
      .integer("supply_order_id")
      .references("id")
      .inTable("supply_orders")
      .onDelete("CASCADE")
      .notNullable();
    table.integer("ingredient_id").notNullable();
    table.decimal("quantity", 10, 3).notNullable();
    table.enu("unit", ["kg", "g", "l", "ml", "unidad"]).notNullable();
    table.decimal("unit_cost", 10, 2).notNullable();
    table.decimal("received_quantity", 10, 3).defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("batches", (table) => {
    table.increments("id").primary();
    table
      .integer("supply_order_id")
      .references("id")
      .inTable("supply_orders")
      .onDelete("CASCADE")
      .notNullable();
    table.integer("ingredient_id").notNullable();
    table.integer("supplier_id").notNullable();
    table.integer("location_id").notNullable();
    table.date("entry_date").defaultTo(knex.fn.now()).notNullable();
    table.date("expiration_date").notNullable();
    table.decimal("initial_quantity", 10, 2).notNullable();
    table.decimal("current_quantity", 10, 3).notNullable();
    table.enu("unit", ["kg", "g", "ml", "l", "unidad"]).notNullable();
    table.enu("status", ["ACTIVO", "AGOTADO", "VENCIDO"]).defaultTo("ACTIVO");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("stocks", (table) => {
    table.increments("id").primary();
    table.integer("ingredient_id").notNullable();
    table.integer("location_id").notNullable();
    table.decimal("total_quantity", 10, 3).notNullable();
    table.enu("unit", ["kg", "g", "ml", "l", "unidad"]).notNullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["ingredient_id", "location_id"]);
  });

  await knex.schema.createTable("inventory_logs", (table) => {
    table.increments("id").primary();
    table.integer("ingredient_id").notNullable();
    table.integer("location_id").notNullable();
    table.enu("type", ["ENTRADA", "SALIDA", "AJUSTE"]).notNullable();
    table.decimal("quantity", 10, 3).notNullable();
    table.enu("unit", ["kg", "g", "ml", "l", "unidad"]).notNullable();
    table.string("reason", 255); // Motivo del movimiento, por ejemplo: "Compra", "Venta", "Merma", etc.
    table.integer("reference_id"); // ID de la tabla de origen, por ejemplo: "supply_order_items", etc.
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("low_stock_configs", (table) => {
    table.increments("id").primary();
    table.integer("ingredient_id").notNullable();
    table.integer("location_id").notNullable();
    table.decimal("min_threshold", 10, 3).notNullable();
    table.enu("unit", ["kg", "g", "ml", "l", "unidad"]).notNullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["ingredient_id", "location_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("low_stock_configs");
  await knex.schema.dropTableIfExists("inventory_logs");
  await knex.schema.dropTableIfExists("stocks");
  await knex.schema.dropTableIfExists("batches");
  await knex.schema.dropTableIfExists("supply_order_items");
  await knex.schema.dropTableIfExists("supply_orders");
}
