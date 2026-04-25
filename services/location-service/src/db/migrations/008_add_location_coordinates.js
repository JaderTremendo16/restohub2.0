exports.up = async function (knex) {
    await knex.schema.table('locations', function (t) {
        t.float('lat').nullable();
        t.float('lng').nullable();
    });
};

exports.down = async function (knex) {
    await knex.schema.table('locations', function (t) {
        t.dropColumn('lat');
        t.dropColumn('lng');
    });
};
