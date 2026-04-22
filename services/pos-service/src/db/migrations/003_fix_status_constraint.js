exports.up = async function (knex) {
  // Eliminar el constraint de check y convertir a varchar libre
  await knex.raw(`
    ALTER TABLE pos_orders 
    DROP CONSTRAINT IF EXISTS pos_orders_status_check
  `);
  await knex.raw(`
    ALTER TABLE pos_orders 
    ALTER COLUMN status TYPE varchar(30)
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE pos_orders 
    ALTER COLUMN status TYPE varchar(30)
  `);
};
