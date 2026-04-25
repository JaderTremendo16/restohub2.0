export async function up(knex) {
  return knex.schema.table('dishes', function(table) {
    table.string('image_url').nullable();
  });
}

export async function down(knex) {
  return knex.schema.table('dishes', function(table) {
    table.dropColumn('image_url');
  });
}
