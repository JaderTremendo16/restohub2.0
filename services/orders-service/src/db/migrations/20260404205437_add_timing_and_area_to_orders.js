exports.up = function(knex) {
  return knex.schema.alterTable('orders', function(table) {
    table.string('area').defaultTo('kitchen')
    table.timestamp('validated_at')
    table.timestamp('preparation_started_at')
    table.timestamp('packing_at')
    table.timestamp('ready_at')
    table.timestamp('delivered_at')
    table.integer('estimated_preparation_time').defaultTo(20)
  })
}

exports.down = function(knex) {
  return knex.schema.alterTable('orders', function(table) {
    table.dropColumn('area')
    table.dropColumn('validated_at')
    table.dropColumn('preparation_started_at')
    table.dropColumn('packing_at')
    table.dropColumn('ready_at')
    table.dropColumn('delivered_at')
    table.dropColumn('estimated_preparation_time')
  })
}
