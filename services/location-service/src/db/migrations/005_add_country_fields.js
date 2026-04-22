exports.up = async function (knex) {
    await knex.schema.table('countries', function (t) {
        t.string('currency_symbol', 10);
        t.string('flag_url', 255);
    });
};

exports.down = async function (knex) {
    await knex.schema.table('countries', function (t) {
        t.dropColumn('currency_symbol');
        t.dropColumn('flag_url');
    });
};
