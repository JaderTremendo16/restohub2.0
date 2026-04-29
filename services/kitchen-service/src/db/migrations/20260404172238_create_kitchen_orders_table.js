exports.up = function (knex) {
  return knex.schema.createTable("kitchen_orders", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable().unique();
    table.string("restaurant_id").notNullable();
    table.string("customer_id").notNullable();
    table.string("channel").notNullable();
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
      .defaultTo("received");
    table
      .enu("priority", ["low", "normal", "high"])
      .notNullable()
      .defaultTo("normal");
    table.uuid("assigned_cook_id").references("id").inTable("cooks");
    table.text("notes");
    table.timestamp("received_at").defaultTo(knex.fn.now());
    table.timestamp("ready_at");
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("kitchen_orders");
};
