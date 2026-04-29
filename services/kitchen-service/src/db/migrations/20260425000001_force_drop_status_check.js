exports.up = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE kitchen_orders DROP CONSTRAINT IF EXISTS kitchen_orders_status_check;
  `);
};

exports.down = function (knex) {
  // No es necesario volver a poner la restricción si estamos depurando
};
