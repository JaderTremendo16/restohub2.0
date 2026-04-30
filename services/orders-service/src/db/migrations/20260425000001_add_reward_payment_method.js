exports.up = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS payments_method_check;
    
    ALTER TABLE payments 
    ADD CONSTRAINT payments_method_check 
    CHECK (method IN ('cash', 'card', 'online', 'rappi', 'paypal', 'puntos', 'canje_puntos', 'reward'));
  `);
};

exports.down = function (knex) {
  return knex.schema.raw(`
    ALTER TABLE payments 
    DROP CONSTRAINT IF EXISTS payments_method_check;
    
    ALTER TABLE payments 
    ADD CONSTRAINT payments_method_check 
    CHECK (method IN ('cash', 'card', 'online', 'rappi', 'paypal', 'puntos', 'canje_puntos'));
  `);
};
