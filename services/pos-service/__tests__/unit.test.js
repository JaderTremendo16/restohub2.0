jest.mock('../src/db/knex');
jest.mock('../src/messaging/publisher');

// importamos
const resolvers = require('../src/graphql/resolvers');

// ═════════════════════════════════════════════════════════════
describe('Pruebas Unitarias - pos-service', () => {


  test('U1 - El cambio debe ser amount_received - total', () => {
    //ejecucion
    const resultado = resolvers.Query.calculateChange(null, {
      total: 30000,
      amount_received: 50000,
    });

    //verificamos
    expect(resultado.change_amount).toBe(20000);
  });





  test('U5 - Debe detectar cuando el pago NO es suficiente', () => {

    // ── EJECUCIÓN ──────────────────────────────────────────
    const resultado = resolvers.Query.calculateChange(null, {
      total: 50000,
      amount_received: 30000,
    });

    //verificamos 
    expect(resultado.is_sufficient).toBe(false);
  });

});
