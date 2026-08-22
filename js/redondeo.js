/**
 * redondeo.js
 * Reparto de pesos enteros sin descuadres: la suma de las partes
 * siempre es exactamente igual al total repartido.
 */

/**
 * Reparte `total` entre varias partes según pesos relativos, en pesos enteros.
 * Usa el método de mayores restos para asignar los pesos sobrantes.
 *
 * @param {number} total  valor a repartir (puede tener decimales)
 * @param {number[]} pesos  pesos relativos, no negativos
 * @returns {number[]} enteros que suman exactamente Math.round(total)
 */
export function repartir(total, pesos) {
  const objetivo = Math.round(Number(total) || 0);
  const limpios = pesos.map((p) => Math.max(0, Number(p) || 0));
  const suma = limpios.reduce((a, b) => a + b, 0);

  if (suma <= 0) {
    // Sin pesos válidos: reparto en partes iguales.
    return repartir(objetivo, limpios.map(() => 1));
  }

  const exactos = limpios.map((p) => (objetivo * p) / suma);
  const base = exactos.map((v) => Math.floor(v));
  let faltante = objetivo - base.reduce((a, b) => a + b, 0);

  const orden = exactos
    .map((v, i) => ({ i, resto: v - Math.floor(v) }))
    .sort((a, b) => b.resto - a.resto);

  let k = 0;
  while (faltante > 0 && orden.length > 0) {
    base[orden[k % orden.length].i] += 1;
    faltante -= 1;
    k += 1;
  }
  while (faltante < 0 && orden.length > 0) {
    const idx = orden[orden.length - 1 - (k % orden.length)].i;
    if (base[idx] > 0) {
      base[idx] -= 1;
      faltante += 1;
    }
    k += 1;
  }
  return base;
}

/**
 * Reparte en partes iguales entre `n` partes, en pesos enteros.
 * @returns {number[]}
 */
export function repartirIgual(total, n = 3) {
  return repartir(total, new Array(n).fill(1));
}

/**
 * Ajusta un vector de valores enteros para que sume exactamente `objetivo`,
 * cargando la diferencia (normalmente ±1 o ±2 pesos) a la parte de mayor valor.
 */
export function cuadrar(valores, objetivo) {
  const salida = valores.map((v) => Math.round(Number(v) || 0));
  const dif = Math.round(objetivo) - salida.reduce((a, b) => a + b, 0);
  if (dif === 0) return salida;

  let idx = 0;
  for (let i = 1; i < salida.length; i += 1) {
    if (salida[i] > salida[idx]) idx = i;
  }
  salida[idx] += dif;
  return salida;
}
