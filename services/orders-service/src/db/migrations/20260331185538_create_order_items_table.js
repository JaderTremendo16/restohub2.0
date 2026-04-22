exports.up = function(knex) {
  return knex.schema.createTable('order_items', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE')
    table.string('product_id').notNullable()
    table.string('product_name').notNullable()
    table.integer('quantity').notNullable()
    table.decimal('unit_price', 10, 2).notNullable()
    table.decimal('subtotal', 10, 2).notNullable()
    table.text('notes')
    table.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('order_items')
}