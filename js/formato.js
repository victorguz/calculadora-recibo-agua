/**
 * formato.js
 * Formateo y lectura de valores en pesos colombianos.
 */

const FMT_MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FMT_NUMERO = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** $1.234.567 */
export function pesos(valor) {
  return FMT_MONEDA.format(Math.round(Number(valor) || 0));
}

/** 1.234.567 (sin símbolo) */
export function numero(valor) {
  return FMT_NUMERO.format(Math.round(Number(valor) || 0));
}

/** 33,33 % */
export function porcentaje(valor, decimales = 2) {
  const n = Number(valor) || 0;
  return `${n.toFixed(decimales).replace('.', ',')} %`;
}

/**
 * Convierte lo que escribió el usuario a número.
 * Acepta "300.000", "300000", "$ 300.000", "300000,50" y vacío -> null.
 */
export function leerNumero(texto) {
  if (texto === null || texto === undefined) return null;
  const limpio = String(texto).replace(/[^\d,.-]/g, '').trim();
  if (limpio === '') return null;

  // El separador decimal en es-CO es la coma; los puntos son de miles.
  const normalizado = limpio.replace(/\./g, '').replace(',', '.');
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Igual que leerNumero pero devuelve `porDefecto` cuando viene vacío o inválido. */
export function leerNumeroODefecto(texto, porDefecto = 0) {
  const n = leerNumero(texto);
  return n === null ? porDefecto : n;
}
