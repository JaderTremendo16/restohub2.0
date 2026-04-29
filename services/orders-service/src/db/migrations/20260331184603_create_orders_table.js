exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('restaurant_id').notNullable()
    table.string('customer_id').notNullable()
    table.string('channel').notNullable()
    table.enu('status', [
      'pending',
      'validated',
      'in_preparation',
      'packing',
      'ready',
      'delivered',
      'cancelled'
    ]).notNullable().defaultTo('pending')
    table.enu('priority', ['low', 'normal', 'high']).notNullable().defaultTo('normal')
    table.text('notes')
    table.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('orders')
}