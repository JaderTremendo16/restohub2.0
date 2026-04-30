/**
 * Configuración de monedas por país para RestoHub.
 * Agregar aquí nuevos países cuando se expanda la plataforma.
 *
 * divisor: cuántas unidades de moneda equivalen a 1 punto de lealtad
 *   - 1000: monedas de "miles" (COP, CLP, PYG, ARS)
 *   - 20:   monedas "medias" (MXN, UYU, GTQ)
 *   - 1:    monedas "base" (USD, EUR, GBP, PEN)
 */
export const COUNTRY_CURRENCY = {
  'Colombia':       { code: 'COP', locale: 'es-CO', divisor: 1000 },
  'México':         { code: 'MXN', locale: 'es-MX', divisor: 20   },
  'Mexico':         { code: 'MXN', locale: 'es-MX', divisor: 20   },
  'Chile':          { code: 'CLP', locale: 'es-CL', divisor: 1000 },
  'Argentina':      { code: 'ARS', locale: 'es-AR', divisor: 1000 },
  'Perú':           { code: 'PEN', locale: 'es-PE', divisor: 1    },
  'Peru':           { code: 'PEN', locale: 'es-PE', divisor: 1    },
  'Ecuador':        { code: 'USD', locale: 'es-EC', divisor: 1    },
  'Venezuela':      { code: 'USD', locale: 'es-VE', divisor: 1    },
  'España':         { code: 'EUR', locale: 'es-ES', divisor: 1    },
  'Spain':          { code: 'EUR', locale: 'es-ES', divisor: 1    },
  'Portugal':       { code: 'EUR', locale: 'pt-PT', divisor: 1    },
  'United States':  { code: 'USD', locale: 'en-US', divisor: 1    },
  'EEUU':           { code: 'USD', locale: 'en-US', divisor: 1    },
};

/** Configuración por defecto si el país no está en el mapa. */
const DEFAULT_CONFIG = { code: 'USD', locale: 'en-US', divisor: 1 };

/**
 * Devuelve la configuración de moneda de un país.
 * @param {string} country - Nombre del país del usuario
 */
export const getCurrencyConfig = (country) =>
  COUNTRY_CURRENCY[country] || DEFAULT_CONFIG;

/**
 * Devuelve el código ISO de la moneda del país (ej: 'COP', 'MXN', 'EUR').
 */
export const getCurrencyCode = (country) =>
  getCurrencyConfig(country).code;

/**
 * Formatea un precio con la moneda local del usuario.
 * @param {number} amount  - Monto a formatear
 * @param {string} country - País del usuario
 */
export const formatPrice = (amount, country) => {
  const cfg = getCurrencyConfig(country);
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    minimumFractionDigits: 0,
  }).format(amount);
};
