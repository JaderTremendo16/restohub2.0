// Las migraciones en Knex tienen dos funciones up y down.
// up: Se encarga de crear las tablas en la base de datos.
// down: Se encarga de eliminarlas. Por si uno comete un error y deshacerlas.
// Perfectamente pude haberlo hecho con archivos apartes, uno por cada tabla, pero aqui lo hice así

export async function up(knex) {
  //Como una base de datos de toda la vida. Le pedimos que cree una tabla llamada menu.
  await knex.schema.createTable("dishes", (table) => {
    table.increments("id").primary();
    table.string("name", 180).notNullable();
    table.text("description"); //A diferencia de string, text no tiene límite de caracteres
    table
      .enu("category", ["entrada", "sopa", "principal", "postre", "bebida"])
      .notNullable();
    table.integer("location_id");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("dish_ingredient", (table) => {
    table.increments("id").primary();
    table
      .integer("dish_id")
      .references("id")
      .inTable("dishes")
      .onDelete("CASCADE")
      .notNullable(); // Se usa onDelete('CASCADE') para que si se elimina un plato, se eliminen sus ingredientes
    table.integer("ingredient_id").notNullable(); //No se pone referencia ya que la tabla de ingredientes está en otro microservicio.
    table.decimal("quantity", 10, 3).notNullable(); //Ejemplo: 1.500 gramos o 2 unidades
    table.enu("unit", ["kg", "g", "l", "ml", "unidad"]).notNullable();
  });

  await knex.schema.createTable("menu_prices", (table) => {
    table.increments("id").primary();
    table
      .integer("dish_id")
      .references("id")
      .inTable("dishes")
      .onDelete("CASCADE")
      .notNullable(); //lo mismo que el anterior
    table.decimal("price", 10, 2).notNullable(); //Ejemplo: 15.500}
    table.decimal("profit_margin", 5, 2).defaultTo(0);
    table.date("valid_from").notNullable(); //Fecha desde la cual el precio es válido
    table.date("valid_until"); //Si es null, significa que es indefinido y no tiene fecha de vencimiento
    table.integer("restaurant_id").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

}
export async function down(knex) {
  await knex.schema.dropTableIfExists("menu_prices");
  await knex.schema.dropTableIfExists("dish_ingredient");
  await knex.schema.dropTableIfExists("dishes");
}
