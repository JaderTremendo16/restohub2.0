exports.up = function(knex) {
  return knex.schema.createTable('invoices', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE')
    table.string('invoice_number').notNullable().unique()
    table.decimal('subtotal', 10, 2).notNullable()
    table.decimal('tax', 10, 2).notNullable()
    table.decimal('total', 10, 2).notNullable()
    table.enu('status', ['pending', 'paid', 'cancelled']).notNullable().defaultTo('pending')
    table.string('customer_name').notNullable()
    table.string('customer_email')
    table.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('invoices')
}