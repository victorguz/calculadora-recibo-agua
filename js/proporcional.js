/**
 * proporcional.js
 * Modo 1: sólo se conoce el valor total de la factura.
 *
 * El total se desglosa en conceptos usando el mismo peso que cada concepto
 * tenía en la línea base (indexada por tarifa si aplica). Sobre ese desglose
 * se aplican después las reglas normales del acuerdo.
 */

import { LINEA_BASE, factorTarifa } from './config.js';
import { repartir } from './redondeo.js';

/**
 * @param {number} totalFactura  valor total del recibo
 * @param {object} config
 * @param {{residencial:number,odontologia:number,restaurante:number}} [particulares]
 *        conceptos exclusivos de una unidad; se descuentan antes de prorratear.
 */
export function desglosarPorLineaBase(totalFactura, config, particulares = {}) {
  const total = Math.max(0, Math.round(Number(totalFactura) || 0));

  const propios =
    Math.max(0, Number(particulares.residencial) || 0) +
    Math.max(0, Number(particulares.odontologia) || 0) +
    Math.max(0, Number(particulares.restaurante) || 0);

  const distribuible = Math.max(0, total - Math.round(propios));

  const fAcu = factorTarifa(config.tarifas?.acueducto);
  const fAlc = factorTarifa(config.tarifas?.alcantarillado);
  const fAseo = factorTarifa(config.tarifas?.aseo);

  // Pesos de la línea base, indexados por tarifa.
  const pesos = [
    LINEA_BASE.acueducto * fAcu,
    LINEA_BASE.alcantarillado * fAlc,
    LINEA_BASE.aseoResidencial * fAseo,
    LINEA_BASE.aseoComercial * fAseo,
    LINEA_BASE.iluminacion,
  ];

  const [acueducto, alcantarillado, aseoResidencial, aseoComercial, iluminacion] = repartir(
    distribuible,
    pesos,
  );

  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  const participaciones = pesos.map((p) => (p / sumaPesos) * 100);

  return {
    totalFactura: total,
    valoresPropios: Math.round(propios),
    distribuible,
    factura: {
      acueducto,
      alcantarillado,
      aseoResidencial,
      aseoComercial,
      iluminacion,
      otrosComunes: 0,
      particulares: {
        residencial: Math.round(Math.max(0, Number(particulares.residencial) || 0)),
        odontologia: Math.round(Math.max(0, Number(particulares.odontologia) || 0)),
        restaurante: Math.round(Math.max(0, Number(particulares.restaurante) || 0)),
      },
    },
    participaciones: {
      acueducto: participaciones[0],
      alcantarillado: participaciones[1],
      aseoResidencial: participaciones[2],
      aseoComercial: participaciones[3],
      iluminacion: participaciones[4],
    },
  };
}
