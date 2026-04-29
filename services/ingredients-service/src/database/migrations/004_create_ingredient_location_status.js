export async function up(knex) {
  await knex.schema.createTable("ingredient_location_status", (table) => {
    table.increments("id").primary();
    table.integer("ingredient_id").notNullable();
    table.integer("location_id").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["ingredient_id", "location_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("ingredient_location_status");
}
