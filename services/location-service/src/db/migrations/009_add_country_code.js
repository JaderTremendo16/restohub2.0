exports.up = async function (knex) {
    await knex.schema.table('countries', function (t) {
        t.string('code', 10);
    });
};

exports.down = async function (knex) {
    await knex.schema.table('countries', function (t) {
        t.dropColumn('code');
    });
};
