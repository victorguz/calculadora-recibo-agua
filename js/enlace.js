/**
 * enlace.js
 * Comparte los datos y la configuración por URL.
 *
 * La configuración guardada con el botón "Guardar" vive en el localStorage del
 * navegador y no sale de ese equipo. Para que las tres partes trabajen con los
 * mismos parámetros, este módulo los codifica en la dirección de la página.
 */

/** Nombre corto en la URL para cada dato. */
const CLAVES = {
  total: 't',
  acueducto: 'ac',
  alcantarillado: 'al',
  aseoResidencial: 'ar',
  aseoComercial: 'acom',
  iluminacion: 'il',
  otrosComunes: 'oc',
  partResidencial: 'pr',
  partOdontologia: 'po',
  partRestaurante: 'pt',
  pctRestauranteAA: 'paa',
  pctOdontologiaAseo: 'pas',
  cargoFijoComercial: 'cf',
  localesComerciales: 'loc',
  consumoComercialHistorico: 'ch',
  consumoHabitualDemostrado: 'hab',
  incrementoAseoAlRestaurante: 'inc',
  tarAcuBase: 'tab',
  tarAcuActual: 'taa',
  tarAlcBase: 'tlb',
  tarAlcActual: 'tla',
  tarAseoBase: 'tsb',
  tarAseoActual: 'tsa',
};

/**
 * Construye la URL de la página con los datos actuales.
 * @param {Record<string, string|boolean>} datos  valores tal como están en el formulario
 */
export function construirUrl(datos) {
  const params = new URLSearchParams();
  for (const [campo, clave] of Object.entries(CLAVES)) {
    const valor = datos[campo];
    if (valor === undefined || valor === null || valor === '') continue;
    if (typeof valor === 'boolean') {
      params.set(clave, valor ? '1' : '0');
    } else {
      params.set(clave, String(valor).trim());
    }
  }
  const base = `${location.origin}${location.pathname}`;
  const consulta = params.toString();
  return consulta ? `${base}?${consulta}` : base;
}

/**
 * Lee los datos que vengan en la URL.
 * @returns {Record<string, string|boolean>} sólo los campos presentes
 */
export function leerDesdeUrl(busqueda = location.search) {
  const params = new URLSearchParams(busqueda);
  const datos = {};
  for (const [campo, clave] of Object.entries(CLAVES)) {
    if (!params.has(clave)) continue;
    const crudo = params.get(clave);
    if (campo === 'consumoHabitualDemostrado' || campo === 'incrementoAseoAlRestaurante') {
      datos[campo] = crudo === '1' || crudo === 'true';
    } else {
      datos[campo] = crudo;
    }
  }
  return datos;
}

/** ¿La URL trae al menos un dato? */
export function hayDatosEnUrl(busqueda = location.search) {
  return Object.keys(leerDesdeUrl(busqueda)).length > 0;
}
