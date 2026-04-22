exports.up = function (knex) {
  return knex.schema
    .createTable("kitchen_order_items", function (table) {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("kitchen_order_id")
        .notNullable()
        .references("id")
        .inTable("kitchen_orders")
        .onDelete("CASCADE");
      table.string("product_name").notNullable();
      table.integer("quantity").notNullable().defaultTo(1);
      table.text("notes");
      table.timestamps(true, true);
    })
    .alterTable("kitchen_orders", function (table) {
      table.string("origin").defaultTo("orders"); // 'orders' o 'pos'
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTable("kitchen_order_items")
    .alterTable("kitchen_orders", function (table) {
      table.dropColumn("origin");
    });
};
