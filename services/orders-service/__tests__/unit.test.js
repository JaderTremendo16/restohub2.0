//// mock, simulamos la base de datos y la mensajería.
jest.mock('../src/db/knex');
jest.mock('../src/messaging/publisher');

//importamos
const db = require('../src/db/knex');
const { publishMessage } = require('../src/messaging/publisher');
const resolvers = require('../src/graphql/resolvers');


beforeEach(() => {
  jest.clearAllMocks();
  publishMessage.mockResolvedValue(true);
});

describe('Pruebas Unitarias - orders-service', () => {

  test('U2 - El subtotal debe ser quantity × unit_price', async () => {

    // preparacion
    const mockInsert = jest.fn();
    const mockReturning = jest.fn();
    mockInsert.mockReturnValue({ returning: mockReturning });

    mockReturning.mockResolvedValue([{
      order_id: 1,
      product_id: 10,
      product_name: 'Hamburguesa',
      quantity: 3,
      unit_price: 10000,
      subtotal: 30000,
      notes: null,
    }]);


    //creamos la orden
    db.mockImplementation((tableName) => {
      if (tableName === 'orders') {
        return {

          where: jest.fn().mockReturnValue({

            first: jest.fn().mockResolvedValue({
              id: 1,
              status: 'pending',
              restaurant_id: 1,
              customer_id: null,
              channel: 'web',
              priority: 'normal',
              area: 'hot_kitchen',
            }),
          }),
        };
      }


      if (tableName === 'order_items') {
        return {
          where: jest.fn().mockResolvedValue([]),
          insert: mockInsert,
        };
      }
    });

    // ejecucion

    const resultado = await resolvers.Mutation.addOrderItems(null, {
      order_id: 1,
      items: [{
        product_id: 10,
        product_name: 'Hamburguesa',
        quantity: 3,
        unit_price: 10000,    // 
      }],
    });

    //verificamos
    const itemsCalculados = mockInsert.mock.calls[0][0];
    expect(itemsCalculados[0].subtotal).toEqual(30000);
  });






  test('U3 - El mes 1 del reporte debe ser "Enero"', async () => {

    // preparacion
    db.raw = jest.fn().mockResolvedValue({
      rows: [
        {
          year: 2026,
          month: 1,
          total_orders: '5',
          total_revenue: '150000',
        },
      ],
    });

    // ejecucuion 
    const resultado = await resolvers.Query.monthlyReport(null, {
      fromYear: 2026,
      toYear: 2026,
    });

    // verificamos
    const nombresDesMeses = resultado.map(r => r.monthName);

    // toContain() verifica que el array contenga "Enero"
    expect(nombresDesMeses).toContain('Enero');
  });



  test('U4 - La factura debe tener subtotal, iva y total definidos', async () => {

    //preparacion
    const mockInsert = jest.fn();
    const mockReturning = jest.fn();

    // La factura guardada que devuelve la base de datos
    mockInsert.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{
      id: 1,
      order_id: 1,
      invoice_number: 'FAC-123456',
      subtotal: '100.00',
      tax: '19.00',
      total: '119.00',
      customer_name: 'Juan Pérez',
      status: 'pending',
    }]);

    db.mockImplementation((tableName) => {
      if (tableName === 'orders') {
        return {
          where: jest.fn().mockReturnValue({
            // Pedido en estado "ready" (requisito para facturar)
            first: jest.fn().mockResolvedValue({
              id: 1,
              status: 'ready',
              restaurant_id: 1,
            }),
          }),
        };
      }
      if (tableName === 'invoices') {
        return {
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(null),
          }),
          insert: mockInsert,
        };
      }
      if (tableName === 'order_items') {
        return {
          // Hay 1 ítem con subtotal de $100
          where: jest.fn().mockResolvedValue([
            { id: 1, order_id: 1, subtotal: '100.00' },
          ]),
        };
      }
    });

    // ejecucion
    const resultado = await resolvers.Mutation.generateInvoice(null, {
      order_id: 1,
      customer_name: 'Juan Pérez',
    });

    // verificamos
    // Subtotal sin impuestos
    // Impuesto IVA (19%)
    // Total con impuestos
    expect(resultado.subtotal).toBeDefined();
    expect(resultado.tax).toBeDefined();
    expect(resultado.total).toBeDefined();
  });

});
