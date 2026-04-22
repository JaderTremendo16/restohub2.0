exports.up = async function (knex) {
    await knex.schema.alterTable('users', function (t) {
        t.unique(['location_id'], { indexName: 'users_location_id_unique' });
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('users', function (t) {
        t.dropUnique(['location_id'], 'users_location_id_unique');
    });
};
