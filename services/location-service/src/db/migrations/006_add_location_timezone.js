exports.up = async function (knex) {
    await knex.schema.table('locations', function (t) {
        t.string('timezone', 100);
    });
};

exports.down = async function (knex) {
    await knex.schema.table('locations', function (t) {
        t.dropColumn('timezone');
    });
};
