export async function up(knex) {
  await knex.schema.table("ingredient_costs", (table) => {
    table.integer("country_id").nullable();
    // Quitamos el unique original por sede
    table.dropUnique(["ingredient_id", "location_id"]);
    // Agregamos un unique por ingrediente y país
    table.unique(["ingredient_id", "country_id"]);
  });
}

export async function down(knex) {
  await knex.schema.table("ingredient_costs", (table) => {
    table.dropUnique(["ingredient_id", "country_id"]);
    table.unique(["ingredient_id", "location_id"]);
    table.dropColumn("country_id");
  });
}
