//mocks
jest.mock('../src/db/knex');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../src/messaging/producer');

// importamos
const db = require('../src/db/knex');
const { publishMessage } = require('../src/messaging/producer');
const resolvers = require('../src/graphql/resolvers');


beforeEach(() => {
  jest.clearAllMocks();
  publishMessage.mockResolvedValue(true);
});

describe('Pruebas de Integración - kitchen-service', () => {
  test('I3 - Al cambiar estado debe notificar a orders y POS', async () => {

    //preparacion

    const mockUpdate = jest.fn();
    const mockReturning = jest.fn();

    mockUpdate.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{
      id: 1,
      order_id: 100,
      status: 'in_preparation',
      restaurant_id: '1',
      assigned_cook_id: null,
      preparation_started_at: new Date(),
      updated_at: new Date(),
    }]);

    db.mockImplementation((tableName) => {
      if (tableName === 'kitchen_orders') {
        return {
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({
              id: 1,
              order_id: 100,
              status: 'pending',
              restaurant_id: '1',
            }),
            update: mockUpdate,
          }),
          orderBy: jest.fn().mockResolvedValue([]),
        };
      }
    });

    // ejecucion
    await resolvers.Mutation.updateKitchenOrderStatus(null, {
      id: 1,
      status: 'in_preparation',
    });

    //verificamos, deberia hacer dos llamadas, a pos y a order
    expect(publishMessage).toHaveBeenCalledTimes(2);

    // Verificamos la PRIMERA llamada: notificación al orders-service
    expect(publishMessage).toHaveBeenNthCalledWith(
      1,
      'kitchen_status_updated',
      expect.objectContaining({
        order_id: 100,
        status: 'in_preparation',
      })
    );

    // Verificamos la SEGUNDA llamada: notificación al pos-service
    expect(publishMessage).toHaveBeenNthCalledWith(
      2,
      'kitchen_status_updated_pos',
      expect.objectContaining({
        order_id: 100,
        status: 'in_preparation',
      })
    );
  });





  test('I6 - No se puede cancelar un pedido que ya está listo', async () => {

    // preparacion
    // simulamos un pedido que ya esta ready
    db.mockImplementation((tableName) => {
      if (tableName === 'kitchen_orders') {
        return {
          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({
              id: 1,
              order_id: 100,
              status: 'ready',
              restaurant_id: '1',
            }),
          }),
        };
      }
    });

    // ejecucion y verificacion
    // Intentamos cancelar el pedido que ya está listo.
    // El sistema debe debe lanzar un error
    // .rejects.toThrow() verifica que la Promesa sea RECHAZADA
    await expect(
      resolvers.Mutation.updateKitchenOrderStatus(null, {
        id: 1,
        status: 'cancelled',
      })
    ).rejects.toThrow('No se puede cambiar de estado "ready" a "cancelled"');
  });

});
