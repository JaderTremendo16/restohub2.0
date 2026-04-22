// Las migraciones en Knex tienen dos funciones up y down.
// up: Se encarga de crear las tablas en la base de datos.
// down: Se encarga de eliminarlas. Por si uno comete un error y deshacerlas.
// Perfectamente pude haberlo hecho con archivos apartes, uno por cada tabla, pero aqui lo hice así
export async function up(knex) {
  await knex.schema.createTable("suppliers", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("phone", 20);
    table.string("email", 100);
    table.boolean("is_active").defaultTo(true);
    table.integer("country_id");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("ingredients", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.enu("unit", ["kg", "g", "ml", "l", "unidad"]).notNullable();
    table
      .enu("category", [
        "Frutas",
        "Verduras",
        "Proteinas",
        "Lacteos",
        "Cereales",
        "Bebidas",
        "Otros",
      ])
      .notNullable();
    table.decimal("cost_per_unit", 10, 2).defaultTo(0);
    table
      .integer("supplier_id")
      .references("id")
      .inTable("suppliers")
      .onDelete("SET NULL");
    table.integer("location_id");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
  await knex.schema.createTable("ingredient_costs", (table) => {
    table.increments("id").primary();
    table.integer("ingredient_id").notNullable();
    table.integer("location_id").notNullable();
    table.decimal("cost_per_unit", 10, 2).notNullable();
    table.integer("supplier_id").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["ingredient_id", "location_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("ingredient_costs");
  await knex.schema.dropTableIfExists("ingredients");
  await knex.schema.dropTableIfExists("suppliers");
}
