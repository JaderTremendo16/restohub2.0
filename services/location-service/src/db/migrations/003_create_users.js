exports.up = async function (knex) {
    await knex.schema.createTable('users', function (t) {
        t.increments('id').primary();
        t.string('first_name', 100).notNullable();
        t.string('last_name', 100).notNullable();
        t.string('email', 255).notNullable().unique();
        t.string('password_hash', 255).notNullable();
        t.string('role', 50).notNullable().defaultTo('admin');
        t.integer('location_id')
            .nullable()
            .unsigned()
            .references('id')
            .inTable('locations')
            .onDelete('SET NULL');
        t.timestamps(true, true);
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('users');
};