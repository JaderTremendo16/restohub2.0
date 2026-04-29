exports.up = async function (knex) {
    await knex.schema.table('countries', function (t) {
        t.string('locale', 20).defaultTo('es-CO'); // Por defecto formato latino
    });
};

exports.down = async function (knex) {
    await knex.schema.table('countries', function (t) {
        t.dropColumn('locale');
    });
};
