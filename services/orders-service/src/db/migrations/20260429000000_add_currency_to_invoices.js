exports.up = async function (knex) {
  const hasCurrency = await knex.schema.hasColumn("invoices", "currency");

  if (!hasCurrency) {
    await knex.schema.alterTable("invoices", function (table) {
      table.string("currency", 10).defaultTo("USD");
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable("invoices", function (table) {
    table.dropColumn("currency");
  });
};
