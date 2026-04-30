
// mock, simulamos la base de datos y la mensajería.
jest.mock('../src/db/knex');
jest.mock('../src/messaging/publisher');

// importamos
const db = require('../src/db/knex');
const { publishMessage } = require('../src/messaging/publisher');
const resolvers = require('../src/graphql/resolvers');


beforeEach(() => {
  jest.clearAllMocks();
  publishMessage.mockResolvedValue(true);
});


describe('Pruebas de Integración - orders-service', () => {


  test('I1 - Un pedido nuevo debe tener status "pending"', async () => {

    // preparacion
    // simulamos que la base de datos recibe los datos y devuelve el pedido "guardado" con todos sus campos.
    const mockInsert = jest.fn();
    const mockReturning = jest.fn();

    mockInsert.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{
      id: 1,
      restaurant_id: 1,
      customer_id: null,
      channel: 'web',
      notes: null,
      area: 'hot_kitchen',
      status: 'pending',
      priority: 'normal',
    }]);

    db.mockImplementation((tableName) => {
      if (tableName === 'orders') {
        return { insert: mockInsert };
      }
    });

    // ejecucion
    const resultado = await resolvers.Mutation.createOrder(null, {
      restaurant_id: 1,
      customer_id: null,
      channel: 'web',
      notes: null,
    });

    // verificamos
    expect(resultado.status).toBe('pending');

    expect(db).toHaveBeenCalledWith('orders');
  });






  test('I2 - El reporte mensual debe calcular bien los totales', async () => {

    //preparacion
    db.raw = jest.fn().mockResolvedValue({
      rows: [
        {
          year: 2026,
          month: 1,
          total_orders: '10',
          total_revenue: '500000',
        },
        {
          year: 2026,
          month: 2,
          total_orders: '8',
          total_revenue: '320000',
        },
      ],
    });

    // ejecucion
    const resultado = await resolvers.Query.monthlyReport(null, {
      fromYear: 2026,
      toYear: 2026,
    });

    // verificamos
    expect(resultado).toHaveLength(2);

    // verificamos los cálculos del primer mes (Enero):
    const enero = resultado[0];
    expect(enero.totalOrders).toBe(10);
    expect(enero.totalRevenue).toBe(500000);
    expect(enero.averageTicket).toBe(50000);

    // verificamos que el nombre del mes esté correcto
    expect(enero.monthName).toBe('Enero');

    // verificamos el segundo mes (Febrero):
    const febrero = resultado[1];
    expect(febrero.totalOrders).toBe(8);
    expect(febrero.totalRevenue).toBe(320000);
    expect(febrero.averageTicket).toBe(40000);
    expect(febrero.monthName).toBe('Febrero');
  });






  test('I5 - No se puede facturar un pedido sin ítems', async () => {

    // preparacion
    db.mockImplementation((tableName) => {
      if (tableName === 'orders') {
        return {
          where: jest.fn().mockReturnValue({
            // El pedido existe y está en estado "ready"
            first: jest.fn().mockResolvedValue({
              id: 1,
              status: 'ready',
            }),
          }),
        };
      }
      if (tableName === 'invoices') {
        return {
          where: jest.fn().mockReturnValue({
            // No hay factura previa
            first: jest.fn().mockResolvedValue(null),
          }),
        };
      }
      if (tableName === 'order_items') {
        return {
          // no hay productos en el pedido. esto debe provocar un error.
          where: jest.fn().mockResolvedValue([]),
        };
      }
    });

    // verificacion
    // expect(...).rejects.toThrow() verifica que una función asíncrona lance error

    // osea esperamos que la función FALLE a propósito, porque no debería permitir facturar sin productos.
    await expect(
      resolvers.Mutation.generateInvoice(null, {
        order_id: 1,
        customer_name: 'Juan Pérez',
      })
    ).rejects.toThrow('No se puede generar factura sin ítems');
  });

});
