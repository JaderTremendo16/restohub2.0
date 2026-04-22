exports.up = async function (knex) {
    await knex.schema.createTable('locations', function (t) {
        t.increments('id').primary();
        t.string('name', 150).notNullable();
        t.string('address', 255).notNullable();
        t.integer('country_id')
            .notNullable()
            .unsigned()
            .references('id')
            .inTable('countries')
            .onDelete('CASCADE');
        t.timestamps(true, true);
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('locations');
};