exports.up = async function (knex) {
  // PostgreSQL no permite agregar valores a enum fácilmente,
  // cambiamos la columna a string simple
  await knex.schema.alterTable("pos_orders", function (table) {
    table.string("status", 30).defaultTo("open").alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("pos_orders", function (table) {
    table.string("status", 30).defaultTo("open").alter();
  });
};
