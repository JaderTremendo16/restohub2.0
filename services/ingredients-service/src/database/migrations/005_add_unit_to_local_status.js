export async function up(knex) {
  return knex.schema.table('ingredient_location_status', table => {
    table.string('unit', 10).nullable();
  });
}

export async function down(knex) {
  return knex.schema.table('ingredient_location_status', table => {
    table.dropColumn('unit');
  });
}
