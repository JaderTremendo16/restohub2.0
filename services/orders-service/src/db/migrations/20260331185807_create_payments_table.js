exports.up = function(knex) {
  return knex.schema.createTable('payments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE')
    table.decimal('amount', 10, 2).notNullable()
    table.enu('method', ['cash', 'card', 'online', 'rappi']).notNullable()
    table.enu('status', ['pending', 'completed', 'failed', 'refunded']).notNullable().defaultTo('pending')
    table.string('transaction_id')
    table.string('gateway')
    table.jsonb('gateway_response')
    table.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('payments')
}