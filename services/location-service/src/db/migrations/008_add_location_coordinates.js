exports.up = async function (knex) {
    await knex.schema.alterTable('locations', function (t) {
        t.float('latitude');
        t.float('longitude');
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('locations', function (t) {
        t.dropColumn('latitude');
        t.dropColumn('longitude');
    });
};
