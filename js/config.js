/**
 * config.js
 * Línea base, historial de facturas, parámetros por defecto y persistencia.
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

/* ------------------------------------------------------------------ *
 * Acuerdo sobre el cargo fijo del aseo
 * ------------------------------------------------------------------ */

/**
 * Comunicado a la odontología en octubre de 2026, tras confirmarlo con Triple A.
 * Queda anotado aquí porque cambia el numeral 4 del acuerdo escrito.
 */
export const ACUERDO_CARGO_FIJO = Object.freeze({
  fecha: 'Octubre 2026',
  fuente: 'Confirmado con Triple A',
  texto:
    'La factura incrementa debido al aseo. En Triple A indican que el aumento se debe a que ' +
    'se dieron cuenta de que hay dos locales comerciales, y cada uno debe pagar una tarifa fija ' +
    'mensual, que es la que aparece en la factura: $71.028. Por esto, el cargo fijo mensual ya no ' +
    'se divide 35/65 como estaba, sino que cada local paga el que le corresponde.',
  consecuencias: [
    'El cargo fijo comercial deja de repartirse: cada local comercial asume el suyo.',
    'El consumo (la parte por toneladas) se sigue repartiendo 35% odontología / 65% restaurante.',
    'Todo aumento del consumo sobre el histórico lo asume el restaurante, según el numeral 5.',
  ],
});

/* ------------------------------------------------------------------ *
 * Facturas documentadas
 * ------------------------------------------------------------------ */

/**
 * El "Factor Sub/Apo" de la factura es subsidio o aporte solidario:
 *  - Residencial 15 % de subsidio  → se paga el 85 % de la tarifa de referencia.
 *  - Comercial  100 % de aporte    → se paga el 200 % de la tarifa de referencia.
 * Por eso el cargo fijo de cada local comercial es el doble de su tarifa.
 */
export const FACTURAS = Object.freeze([
  {
    periodo: 'Julio 2026',
    etiqueta: 'Línea base del acuerdo',
    nota: 'Antes de que el restaurante entrara a operar. Es la referencia del numeral 1.',
    acueducto: 84924,
    alcantarillado: 50181,
    iluminacion: 15000,
    otros: 390,
    otrosDetalle: 'Intereses de mora',
    aseo: {
      total: 176030,
      residencial: 49020,
      comercial: 127010,
      localesComerciales: 1,
      cargoFijoUnitario: 72408,
      consumoComercial: 54602,
      toneladasComerciales: 0.1202,
      toneladasResidenciales: 0.0904,
      tarifaCargoFijo: 36204.0,
      tarifaRecoleccion: 136020.43,
    },
  },
  {
    periodo: 'Mes anterior',
    etiqueta: 'Última factura con un solo local comercial',
    nota:
      'El aseo seguía igual que en la línea base. Es la mejor referencia del consumo comercial, ' +
      'porque ya trae las tarifas vigentes.',
    aseo: {
      total: 174373,
      residencial: 48581,
      comercial: 125792,
      localesComerciales: 1,
      cargoFijoUnitario: 70854,
      consumoComercial: 54938,
      toneladasComerciales: 0.118,
      toneladasResidenciales: 0.0887,
      tarifaCargoFijo: 35427.0,
      tarifaRecoleccion: 136035.22,
    },
  },
  {
    periodo: 'Octubre 2026',
    etiqueta: 'Primera factura con dos locales comerciales',
    nota:
      'Aparece el segundo cargo fijo comercial y el tonelaje comercial se multiplica por 2,6. ' +
      'Las tarifas unitarias no se movieron, así que no hay ajuste tarifario que reclamar.',
    aseo: {
      total: 326892,
      residencial: 48658,
      comercial: 278234,
      localesComerciales: 2,
      cargoFijoUnitario: 71028,
      consumoComercial: 136178,
      toneladasComerciales: 0.3032,
      toneladasResidenciales: 0.0887,
      tarifaCargoFijo: 35514.0,
      tarifaRecoleccion: 136035.22,
    },
  },
]);

/** La factura más reciente: de ahí salen los valores sugeridos del formulario. */
export const FACTURA_ACTUAL = FACTURAS[FACTURAS.length - 1];

/**
 * Referencia del consumo comercial de aseo: la última factura en la que el
 * restaurante todavía no figuraba como local aparte.
 */
export const REFERENCIA_ASEO = Object.freeze({
  periodo: FACTURAS[1].periodo,
  residencial: FACTURAS[1].aseo.residencial,
  comercial: FACTURAS[1].aseo.comercial,
  cargoFijoUnitario: FACTURAS[1].aseo.cargoFijoUnitario,
  consumoComercial: FACTURAS[1].aseo.consumoComercial,
  toneladasComerciales: FACTURAS[1].aseo.toneladasComerciales,
});

/** Valores sugeridos en el formulario: los de la factura más reciente. */
export const VALORES_SUGERIDOS = Object.freeze({
  aseoResidencial: FACTURA_ACTUAL.aseo.residencial,
  aseoComercial: FACTURA_ACTUAL.aseo.comercial,
  iluminacion: LINEA_BASE.iluminacion,
  acueducto: LINEA_BASE.acueducto,
  alcantarillado: LINEA_BASE.alcantarillado,
});

/**
 * Desglose literal de la factura de Julio 2026, concepto por concepto.
 * Queda anotado como respaldo de la línea base.
 */
export const LINEA_BASE_DETALLE = Object.freeze({
  periodo: 'Julio 2026',
  consumoM3: 16,
  acueducto: {
    total: 84924,
    conceptos: [
      { nombre: 'Cargo fijo Residencial', tarifa: 9956.0, factor: '10,00 %', precio: 8960.4, cantidad: '1', valor: 8960 },
      { nombre: 'Consumo básico CMI Residencial', tarifa: 3071.7, factor: '10,00 %', precio: 2764.53, cantidad: '16 m³', valor: 44233 },
      { nombre: 'Consumo básico CMO Residencial', tarifa: 2130.73, factor: '10,00 %', precio: 1917.66, cantidad: '16 m³', valor: 30683 },
      { nombre: 'Impuestos y tasas básico Residencial', tarifa: 72.8, factor: '10,00 %', precio: 65.52, cantidad: '16 m³', valor: 1048 },
    ],
  },
  alcantarillado: {
    total: 50181,
    conceptos: [
      { nombre: 'Cargo fijo Residencial', tarifa: 6987.0, factor: '10,00 %', precio: 6288.3, cantidad: '1', valor: 6288 },
      { nombre: 'Consumo básico CMI Residencial', tarifa: 2283.32, factor: '10,00 %', precio: 2054.99, cantidad: '16 m³', valor: 32880 },
      { nombre: 'Consumo básico CMO Residencial', tarifa: 655.32, factor: '10,00 %', precio: 589.79, cantidad: '16 m³', valor: 9437 },
      { nombre: 'Impuestos y tasas básico Residencial', tarifa: 109.53, factor: '10,00 %', precio: 98.58, cantidad: '16 m³', valor: 1577 },
    ],
  },
  aseo: {
    total: 176030,
    residencialFacturado: 49020,
    comercialFacturado: 127010,
    conceptos: [
      { nombre: 'Costo fijo total Residencial', tarifa: 36204.0, factor: '15,00 %', precio: 30773.4, cantidad: '1,0000', valor: 30774, grupo: 'residencial' },
      { nombre: 'Recol y transp Residencial', tarifa: 136020.43, factor: '15,00 %', precio: 115617.37, cantidad: '0,0904 ton', valor: 10449, grupo: 'residencial' },
      { nombre: 'Disposición final Residencial', tarifa: 43909.27, factor: '15,00 %', precio: 37322.88, cantidad: '0,0904 ton', valor: 3373, grupo: 'residencial' },
      { nombre: 'Lixiviados Residencial', tarifa: 1788.15, factor: '15,00 %', precio: 1519.93, cantidad: '0,0904 ton', valor: 138, grupo: 'residencial' },
      { nombre: 'Valor base aprov Residencial', tarifa: 179929.7, factor: '15,00 %', precio: 152940.25, cantidad: '0,0210 ton', valor: 3210, grupo: 'residencial' },
      { nombre: 'Incentivo aprov gob Residencial', tarifa: 14007.24, factor: '15,00 %', precio: 11906.15, cantidad: '0,0904 ton', valor: 1076, grupo: 'residencial' },
      { nombre: 'Costo fijo total Comercial', tarifa: 36204.0, factor: '100,00 %', precio: 72408.0, cantidad: '1,0000', valor: 72408, grupo: 'comercial' },
      { nombre: 'Recol y transp Comercial', tarifa: 136020.43, factor: '100,00 %', precio: 272040.86, cantidad: '0,1202 ton', valor: 32696, grupo: 'comercial' },
      { nombre: 'Disposición final Comercial', tarifa: 43909.27, factor: '100,00 %', precio: 87818.54, cantidad: '0,1202 ton', valor: 10556, grupo: 'comercial' },
      { nombre: 'Lixiviados Comercial', tarifa: 1788.15, factor: '100,00 %', precio: 3576.3, cantidad: '0,1202 ton', valor: 430, grupo: 'comercial' },
      { nombre: 'Valor base aprov Comercial', tarifa: 179929.7, factor: '100,00 %', precio: 359859.4, cantidad: '0,0210 ton', valor: 7552, grupo: 'comercial' },
      { nombre: 'Incentivo aprov gob Comercial', tarifa: 14007.24, factor: '100,00 %', precio: 28014.48, cantidad: '0,1202 ton', valor: 3368, grupo: 'comercial' },
    ],
  },
  otros: {
    total: 390,
    conceptos: [{ nombre: 'Intereses de mora', valor: 390 }],
  },
});

/**
 * Valor unitario de referencia que trae la factura de la línea base.
 * Sirve para precargar el ajuste anual: sólo hay que digitar el valor actual.
 */
export const TARIFAS_LINEA_BASE = Object.freeze({
  acueducto: 5275.23,
  alcantarillado: 3048.17,
  aseo: 136020.43,
});

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
  /**
   * Participación del restaurante en acueducto + alcantarillado.
   * Arranca en 33,33% y sólo sube por revisión semestral con evidencia. Numeral 3.
   */
  pctRestauranteAA: 33.3333,

  /** Reparto del CONSUMO del componente comercial de aseo. Numeral 4. */
  pctOdontologiaAseo: 35,
  pctRestauranteAseo: 65,

  /** Cargo fijo mensual de cada local comercial. Cada local asume el suyo. */
  cargoFijoComercial: FACTURA_ACTUAL.aseo.cargoFijoUnitario,

  /** Locales comerciales que cobra la factura: odontología + restaurante. */
  localesComerciales: FACTURA_ACTUAL.aseo.localesComerciales,

  /** Consumo comercial de aseo del período de referencia, sin cargo fijo. */
  consumoComercialHistorico: REFERENCIA_ASEO.consumoComercial,

  /**
   * Residencial y odontología demostraron que mantienen su consumo habitual.
   * Condición para atribuir el incremento al restaurante. Numeral 2, escenario B.
   */
  consumoHabitualDemostrado: true,

  /**
   * Hay evidencia de que el incremento del consumo de aseo proviene de los
   * residuos del restaurante. Numeral 5. Activo desde octubre de 2026: el
   * residencial no se movió y la odontología sostiene su tonelaje histórico.
   */
  incrementoAseoAlRestaurante: true,

  /**
   * Tarifas unitarias para el ajuste anual (escenario C). El valor base viene
   * precargado con el de la factura de la línea base; si se digita el valor
   * actual, la línea base se indexa con el factor actual/base y ese mayor
   * valor NO se le carga al restaurante.
   */
  tarifas: {
    acueducto: { base: TARIFAS_LINEA_BASE.acueducto, actual: 0 },
    alcantarillado: { base: TARIFAS_LINEA_BASE.alcantarillado, actual: 0 },
    aseo: { base: TARIFAS_LINEA_BASE.aseo, actual: 0 },
  },
});

const CLAVE_ALMACEN = 'cra.config.v3';

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

/** Factor de indexación tarifaria: 1 si no hay valor actual configurado. */
export function factorTarifa(par) {
  const base = Number(par?.base) || 0;
  const actual = Number(par?.actual) || 0;
  if (base <= 0 || actual <= 0) return 1;
  return actual / base;
}
