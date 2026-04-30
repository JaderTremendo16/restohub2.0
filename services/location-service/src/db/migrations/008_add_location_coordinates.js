exports.up = async function (knex) {
    await knex.schema.table('locations', function (t) {
        t.float('latitude').nullable();
        t.float('longitude').nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.table('locations', function (t) {
        t.dropColumn('latitude');
        t.dropColumn('longitude');
    });
};
