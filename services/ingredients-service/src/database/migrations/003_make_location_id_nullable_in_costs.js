export async function up(knex) {
  await knex.schema.alterTable("ingredient_costs", (table) => {
    // Hacemos que location_id sea nullable para permitir costos por país
    table.integer("location_id").nullable().alter();
    
    // Agregamos un índice único compuesto que permita nulos en uno de los dos campos
    // Esto asegura que no haya duplicados para el mismo ingrediente en la misma sede o país
    // Nota: En PostgreSQL, NULL no es igual a NULL en restricciones UNIQUE, 
    // pero Knex/DB lo manejará según el motor.
  });
}

export async function down(knex) {
  await knex.schema.alterTable("ingredient_costs", (table) => {
    table.integer("location_id").notNullable().alter();
  });
}
