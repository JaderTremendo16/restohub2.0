exports.up = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE kitchen_orders DROP CONSTRAINT IF EXISTS kitchen_orders_status_check;
  `);
};

exports.down = function (knex) {
  return knex.schema.alterTable("kitchen_orders", function (table) {
    table
      .enu("status", [
        "pending",
        "received",
        "in_preparation",
        "packing",
        "ready",
        "cancelled",
      ])
      .notNullable()
      .alter();
  });
};
