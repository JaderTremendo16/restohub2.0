export async function up(knex) {
  await knex.schema.createTable("dish_location_status", (table) => {
    table.increments("id").primary();
    table.integer("dish_id").references("id").inTable("dishes").onDelete("CASCADE").notNullable();
    table.integer("location_id").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["dish_id", "location_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("dish_location_status");
}
