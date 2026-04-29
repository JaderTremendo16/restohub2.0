exports.up = function (knex) {
  return knex.schema.alterTable("kitchen_orders", function (table) {
    table.timestamp("preparation_started_at").nullable();
    table.timestamp("delivered_at").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("kitchen_orders", function (table) {
    table.dropColumn("preparation_started_at");
    table.dropColumn("delivered_at");
  });
};
