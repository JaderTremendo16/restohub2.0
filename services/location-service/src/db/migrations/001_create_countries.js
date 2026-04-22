exports.up = async function (knex) {
    await knex.schema.createTable('countries', function (t) {
        t.increments('id').primary();
        t.string('name', 100).notNullable().unique();
        t.string('currency_code', 10).notNullable();
        t.string('timezone', 100).notNullable();
        t.timestamps(true, true);
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('countries');
};