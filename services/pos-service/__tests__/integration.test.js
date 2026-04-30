// mocks
jest.mock('../src/db/knex');
jest.mock('../src/messaging/publisher');

// importamos lo que vamos a testear
const db = require('../src/db/knex');
const { publishMessage } = require('../src/messaging/publisher');
const resolvers = require('../src/graphql/resolvers');


beforeEach(() => {
  jest.clearAllMocks();
  publishMessage.mockResolvedValue(true);
});

// test i4 
describe('Pruebas de Integración - pos-service', () => {


  test('I4 - Al pagar debe notificar al orders-service y al inventario', async () => {

    //simulamos en el pos el pago
    // mock para el .update().returning() del pago
    const mockUpdate = jest.fn();
    const mockReturning = jest.fn();
    mockUpdate.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{
      id: 1,
      restaurant_id: '1',
      cashier_name: 'María',
      status: 'delivered',
      payment_method: 'efectivo',
      amount_received: 50000,
      change_amount: 10000,
      total: '40000.00',
    }]);

    db.mockImplementation((tableName) => {
      if (tableName === 'pos_orders') {
        return {
          where: jest.fn().mockReturnValue({
            // el pedido existe, está facturado y tiene total de $40.000
            first: jest.fn().mockResolvedValue({
              id: 1,
              restaurant_id: '1',
              cashier_name: 'María',
              status: 'billed',
              total: '40000.00',
            }),
            // Para el .update() encadenado
            update: mockUpdate,
          }),
          orderBy: jest.fn().mockResolvedValue([]),
        };
      }
      if (tableName === 'pos_order_items') {
        return {
          where: jest.fn().mockResolvedValue([
            { id: 1, product_id: 10, product_name: 'Hamburguesa', quantity: 2 },
            { id: 2, product_id: 20, product_name: 'Papas fritas', quantity: 1 },
          ]),
        };
      }
    });

    //ejecucion 
    await resolvers.Mutation.payPosOrder(null, {
      id: 1,
      payment_method: 'efectivo',
      amount_received: 50000,
    });

    //verificamos que se envien las notis

    // Notificación 1: orders-service (el pedido fue entregado)
    expect(publishMessage).toHaveBeenCalledWith(
      'order_status_updated',
      expect.objectContaining({
        order_id: 1,
        status: 'delivered',
      })
    );

    // Notificación 2: inventory-service (descontar stock)
    expect(publishMessage).toHaveBeenCalledWith(
      'inventory_deduction_requested',
      expect.objectContaining({
        order_id: 1,
        restaurant_id: '1',
        // Debe incluir los ítems con product_id y quantity
        items: expect.arrayContaining([
          expect.objectContaining({ product_id: 10, quantity: 2 }),
          expect.objectContaining({ product_id: 20, quantity: 1 }),
        ]),
      })
    );


    expect(publishMessage).toHaveBeenCalledTimes(2);
  });

});
