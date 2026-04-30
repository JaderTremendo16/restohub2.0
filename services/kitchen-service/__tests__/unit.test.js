
//mocks
jest.mock('../src/db/knex');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../src/messaging/producer');

// importamos
const db = require('../src/db/knex');
const bcrypt = require('bcryptjs');
const resolvers = require('../src/graphql/resolvers');


beforeEach(() => {
  jest.clearAllMocks();
});


describe('Pruebas Unitarias - kitchen-service', () => {

  test('U6 - Si no se pasa rol, debe asignar "cook" por defecto', async () => {

    // preparacion
    bcrypt.hash.mockResolvedValue('hash_falso_123');

    const mockInsert = jest.fn();
    const mockReturning = jest.fn();

    mockInsert.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{
      id: 1,
      name: 'Carlos',
      email: 'carlos@cocina.com',
      restaurant_id: '1',
      role: 'cook',
      active: true,
    }]);

    db.mockImplementation((tableName) => {
      if (tableName === 'cooks') {
        return {

          where: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(null),
          }),
          insert: mockInsert,
        };
      }
    });

    // ejecucion (con await = Prueba de Promesa) 
    // Usamos "await" porque registerCook es "async".
    // Con el await, esperamos a que la Promesa se resuelva y
    // obtenemos el cocinero guardado.
    const resultado = await resolvers.Mutation.registerCook(null, {
      name: 'Carlos',
      email: 'carlos@cocina.com',
      password: '123456',
      restaurant_id: '1',
      // no pasamos pasamos el campo "role" a propósito, el código debe asignar "cook" automáticamente
    });

    // verificamos
    expect(resultado.role).toBe('cook');
    const datosInsertados = mockInsert.mock.calls[0][0];
    expect(datosInsertados.role).toBe('cook');
  });

});
