//Configuración de Jest GLOBAL para todo el ecosistema RestoHub

//En lugar de ejecutar pruebas en un solo microserv, esta configuración agrupa los microservicios y genera un solo reporte de cobertura.
module.exports = {
  projects: [
    '<rootDir>/services/orders-service',
    '<rootDir>/services/kitchen-service',
    '<rootDir>/services/pos-service'
  ],

  collectCoverage: true,

  // donde y en que formatos se guarda el reporte
  coverageDirectory: '<rootDir>/coverage_global',
  coverageReporters: ['text', 'html', 'lcov'],
};
