exports.up = function (knex) {
  return knex.schema.alterTable("pos_orders", function (table) {
    table.boolean("sent_to_kitchen").defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("pos_orders", function (table) {
    table.dropColumn("sent_to_kitchen");
  });
};
