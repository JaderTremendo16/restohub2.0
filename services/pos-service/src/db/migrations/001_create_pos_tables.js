exports.up = function (knex) {
  return knex.schema
    .createTable("pos_orders", function (table) {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("restaurant_id").notNullable();
      table.string("cashier_name").notNullable();
      table.string("table_ref");
      table.text("notes");
      table
        .enu("status", ["open", "billed", "paid", "cancelled"])
        .defaultTo("open");
      table.enu("payment_method", [
        "cash",
        "card",
        "nequi",
        "daviplata",
        "transfer",
      ]);
      table.decimal("subtotal", 10, 2).defaultTo(0);
      table.decimal("tax", 10, 2).defaultTo(0);
      table.decimal("total", 10, 2).defaultTo(0);
      table.decimal("amount_received", 10, 2);
      table.decimal("change_amount", 10, 2);
      table.string("invoice_number");
      table.string("customer_name");
      table.string("customer_document");
      table.string("orders_service_id"); // ID del pedido en orders-service
      table.timestamps(true, true);
    })
    .createTable("pos_order_items", function (table) {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table
        .uuid("pos_order_id")
        .references("id")
        .inTable("pos_orders")
        .onDelete("CASCADE");
      table.string("product_id");
      table.string("product_name").notNullable();
      table.integer("quantity").notNullable();
      table.decimal("unit_price", 10, 2).notNullable();
      table.decimal("subtotal", 10, 2).notNullable();
      table.text("notes");
      table.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("pos_order_items")
    .dropTableIfExists("pos_orders");
};
