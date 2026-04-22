exports.up = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE pos_orders 
    DROP CONSTRAINT IF EXISTS pos_orders_payment_method_check,
    ADD CONSTRAINT pos_orders_payment_method_check 
    CHECK (payment_method IN ('cash', 'card', 'nequi', 'daviplata', 'transfer', 'paypal', 'none'))
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE pos_orders 
    DROP CONSTRAINT IF EXISTS pos_orders_payment_method_check,
    ADD CONSTRAINT pos_orders_payment_method_check 
    CHECK (payment_method IN ('cash', 'card', 'nequi', 'daviplata', 'transfer'))
  `);
};
