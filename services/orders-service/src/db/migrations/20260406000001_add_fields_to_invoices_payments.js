exports.up = async function (knex) {
  const hasDocument = await knex.schema.hasColumn(
    "invoices",
    "customer_document",
  );
  const hasPaymentMethod = await knex.schema.hasColumn(
    "invoices",
    "payment_method",
  );
  const hasNotes = await knex.schema.hasColumn("invoices", "notes");
  const hasPaidAt = await knex.schema.hasColumn("payments", "paid_at");

  await knex.schema.alterTable("invoices", function (table) {
    if (!hasDocument) table.string("customer_document", 20);
    if (!hasPaymentMethod) table.string("payment_method", 50);
    if (!hasNotes) table.text("notes");
  });

  await knex.schema.alterTable("payments", function (table) {
    if (!hasPaidAt) table.timestamp("paid_at");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("invoices", function (table) {
    table.dropColumn("customer_document");
    table.dropColumn("payment_method");
    table.dropColumn("notes");
  });
  await knex.schema.alterTable("payments", function (table) {
    table.dropColumn("paid_at");
  });
};
