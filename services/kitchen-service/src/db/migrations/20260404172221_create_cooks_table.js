exports.up = function(knex) {
  return knex.schema.createTable('cooks', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name').notNullable()
    table.string('email').notNullable().unique()
    table.string('password').notNullable()
    table.string('restaurant_id').notNullable()
    table.enu('role', ['chef', 'cook', 'assistant']).notNullable().defaultTo('cook')
    table.boolean('active').defaultTo(true)
    table.timestamps(true, true)
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('cooks')
}