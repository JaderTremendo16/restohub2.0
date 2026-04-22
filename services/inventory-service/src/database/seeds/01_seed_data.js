export async function seed(knex) {
  // ─── Limpiar tablas en orden inverso a las FK ──────────────────
  await knex("low_stock_configs").del();
  await knex("inventory_logs").del();
  await knex("stocks").del();
  await knex("batches").del();
  await knex("supply_order_items").del();
  await knex("supply_orders").del();

  // ─── Supply Orders ─────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  await knex("supply_orders").insert([
    {
      id: 1,
      supplier_id: 1,
      location_id: 1,
      status: "PENDIENTE",
      total_cost: 85000,
      order_date: today,
      notes: "Pedido de Harina y Sal",
    },
    {
      id: 2,
      supplier_id: 1,
      location_id: 1,
      status: "RECIBIDO",
      total_cost: 210000,
      order_date: "2026-03-01",
      received_date: "2026-03-03",
      notes: "Pedido de Tomates y Carne",
    },
    {
      id: 3,
      supplier_id: 2,
      location_id: 1,
      status: "CANCELADO",
      total_cost: 45000,
      order_date: "2026-02-15",
      notes: "Pedido cancelado por proveedor",
    },
  ]);

  // ─── Supply Order Items ────────────────────────────────────────
  await knex("supply_order_items").insert([
    {
      supply_order_id: 1,
      ingredient_id: 1,
      quantity: 50,
      unit: "kg",
      unit_cost: 1200,
      received_quantity: 0,
    },
    {
      supply_order_id: 1,
      ingredient_id: 2,
      quantity: 10,
      unit: "kg",
      unit_cost: 500,
      received_quantity: 0,
    },
    {
      supply_order_id: 2,
      ingredient_id: 3,
      quantity: 30,
      unit: "kg",
      unit_cost: 3500,
      received_quantity: 30,
    },
    {
      supply_order_id: 2,
      ingredient_id: 4,
      quantity: 20,
      unit: "kg",
      unit_cost: 7000,
      received_quantity: 18,
    },
  ]);

  // ─── Batches ───────────────────────────────────────────────────
  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);

  const inOneYear = new Date();
  inOneYear.setFullYear(inOneYear.getFullYear() + 1);

  await knex("batches").insert([
    {
      supply_order_id: 2,
      ingredient_id: 1,
      location_id: 1,
      supplier_id: 1,
      entry_date: today,
      expiration_date: inOneYear.toISOString().split("T")[0],
      initial_quantity: 50,
      current_quantity: 50,
      unit: "kg",
      status: "ACTIVO",
    },
    {
      supply_order_id: 2,
      ingredient_id: 2,
      location_id: 1,
      supplier_id: 1,
      entry_date: today,
      expiration_date: in3Days.toISOString().split("T")[0],
      initial_quantity: 10,
      current_quantity: 7,
      unit: "L",
      status: "ACTIVO",
    },
    {
      supply_order_id: 2,
      ingredient_id: 3,
      location_id: 1,
      supplier_id: 1,
      entry_date: today,
      expiration_date: "2026-03-01",
      initial_quantity: 20,
      current_quantity: 0,
      unit: "kg",
      status: "AGOTADO",
    },
  ]);

  // ─── Stocks ────────────────────────────────────────────────────
  await knex("stocks").insert([
    {
      ingredient_id: 4,
      location_id: 1,
      total_quantity: 5,
      unit: "kg",
    },
    {
      ingredient_id: 1,
      location_id: 1,
      total_quantity: 100,
      unit: "kg",
    },
    {
      ingredient_id: 2,
      location_id: 1,
      total_quantity: 7,
      unit: "L",
    },
    {
      ingredient_id: 3,
      location_id: 1,
      total_quantity: 25,
      unit: "kg",
    },
  ]);

  // ─── Inventory Logs ────────────────────────────────────────────
  await knex("inventory_logs").insert([
    {
      ingredient_id: 1,
      location_id: 1,
      type: "ENTRADA",
      quantity: 100,
      unit: "kg",
      reason: "Carga inicial por inventario físico",
      reference_id: 1,
    },
    {
      ingredient_id: 3,
      location_id: 1,
      type: "SALIDA",
      quantity: 5,
      unit: "kg",
      reason: "Merma por producto vencido",
      reference_id: 3,
    },
  ]);

  // ─── Low Stock Configs ─────────────────────────────────────────
  await knex("low_stock_configs").insert([
    {
      ingredient_id: 4,
      location_id: 1,
      min_threshold: 20,
      unit: "kg",
      is_active: true,
    },
    {
      ingredient_id: 2,
      location_id: 1,
      min_threshold: 1,
      unit: "kg",
      is_active: true,
    },
  ]);

  await knex.raw(
    "SELECT setval('supply_orders_id_seq', (SELECT MAX(id) FROM supply_orders))",
  );
  await knex.raw(
    "SELECT setval('batches_id_seq', (SELECT MAX(id) FROM batches))",
  );
  await knex.raw(
    "SELECT setval('supply_order_items_id_seq', (SELECT MAX(id) FROM supply_order_items))",
  );

  console.log("✓ Semillas cargadas correctamente");
}
