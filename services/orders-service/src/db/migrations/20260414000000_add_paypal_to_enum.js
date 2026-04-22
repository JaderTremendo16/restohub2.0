exports.up = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS payments_method_check,
    ADD CONSTRAINT payments_method_check 
    CHECK (method IN ('cash', 'card', 'online', 'rappi', 'paypal'));

    ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS invoices_status_check;
    ALTER TABLE invoices
    ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded'));
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS payments_method_check,
    ADD CONSTRAINT payments_method_check 
    CHECK (method IN ('cash', 'card', 'online', 'rappi'));
  `);
};
