/**
 * config.js
 * Línea base, parámetros por defecto y persistencia de la configuración.
 *
 * La línea base corresponde a la factura de Julio 2026 (residencial + odontología),
 * antes del inicio de la operación del restaurante. Numeral 1 del acuerdo.
 */

export const LINEA_BASE = Object.freeze({
  periodo: 'Julio 2026',
  acueducto: 84924,
  alcantarillado: 50181,
  aseoResidencial: 44296,
  aseoComercial: 131734,
  iluminacion: 15000,
});

/** Acueducto + alcantarillado de la línea base: $135.105 */
export const BASE_AA = LINEA_BASE.acueducto + LINEA_BASE.alcantarillado;
/** Aseo total de la línea base: $176.030 */
export const BASE_ASEO = LINEA_BASE.aseoResidencial + LINEA_BASE.aseoComercial;
/** Total de la factura de línea base: $326.135 */
export const BASE_TOTAL = BASE_AA + BASE_ASEO + LINEA_BASE.iluminacion;

export const PARTES = Object.freeze([
  { id: 'residencial', nombre: 'Residencial', icono: '🏠' },
  { id: 'odontologia', nombre: 'Odontología', icono: '🦷' },
  { id: 'restaurante', nombre: 'Restaurante', icono: '🍽️' },
]);

/**
 * Configuración por defecto. Todos los campos del formulario son opcionales:
 * si el usuario no los diligencia se usan estos valores.
 */
export const CONFIG_DEFAULT = Object.freeze({
  /** Margen (%) dentro del cual se considera que el consumo "no aumentó". Numeral 2. */
  toleranciaPct: 5,

  /**
   * Participación del restaurante en acueducto + alcantarillado.
   * Arranca en 33,33% y sólo sube por revisión semestral con evidencia. Numeral 3.
   */
  pctRestauranteAA: 33.3333,

  /** Reparto del componente comercial de aseo. Numeral 4. */
  pctOdontologiaAseo: 35,
  pctRestauranteAseo: 65,

  /**
   * Residencial y odontología demostraron que mantienen su consumo habitual.
   * Condición para atribuir el incremento al restaurante. Numeral 2, escenario B.
   */
  consumoHabitualDemostrado: true,

  /**
   * Hay evidencia de que el incremento de aseo comercial proviene de los
   * residuos del restaurante. Numeral 5.
   */
  incrementoAseoAlRestaurante: false,

  /**
   * Tarifas unitarias para el ajuste anual (escenario C). Si base y actual
   * están diligenciadas, la línea base se indexa con el factor actual/base
   * y ese mayor valor NO se le carga al restaurante.
   */
  tarifas: {
    acueducto: { base: 0, actual: 0 },
    alcantarillado: { base: 0, actual: 0 },
    aseo: { base: 0, actual: 0 },
  },
});

const CLAVE_ALMACEN = 'cra.config.v1';

/** Mezcla profunda sencilla, suficiente para la forma de CONFIG_DEFAULT. */
function fusionar(base, extra) {
  const salida = { ...base };
  for (const [clave, valor] of Object.entries(extra || {})) {
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      salida[clave] = fusionar(base[clave] || {}, valor);
    } else if (valor !== undefined && valor !== null && valor !== '') {
      salida[clave] = valor;
    }
  }
  return salida;
}

export function configConDefaults(parcial) {
  return fusionar(CONFIG_DEFAULT, parcial);
}

export function guardarConfig(config) {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export function cargarConfig() {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN);
    return crudo ? configConDefaults(JSON.parse(crudo)) : configConDefaults({});
  } catch {
    return configConDefaults({});
  }
}

export function borrarConfig() {
  try {
    localStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    /* sin almacenamiento disponible */
  }
}

/** Factor de indexación tarifaria: 1 si no hay tarifas configuradas. */
export function factorTarifa(par) {
  const base = Number(par?.base) || 0;
  const actual = Number(par?.actual) || 0;
  if (base <= 0 || actual <= 0) return 1;
  return actual / base;
}
