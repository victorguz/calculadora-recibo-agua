/**
 * motor.js
 * Orquesta las reglas del acuerdo y arma el resultado completo.
 */

import { configConDefaults, BASE_AA, BASE_ASEO, BASE_TOTAL, LINEA_BASE } from './config.js';
import { distribuirAcueducto } from './reglas/acueducto.js';
import { distribuirAseo } from './reglas/aseo.js';
import { distribuirComunes } from './reglas/comunes.js';
import { distribuirParticulares } from './reglas/particulares.js';
import { desglosarPorLineaBase } from './proporcional.js';

const VACIO = { residencial: 0, odontologia: 0, restaurante: 0 };

function sumarRepartos(bloques) {
  return bloques.reduce(
    (acc, b) => ({
      residencial: acc.residencial + b.reparto.residencial,
      odontologia: acc.odontologia + b.reparto.odontologia,
      restaurante: acc.restaurante + b.reparto.restaurante,
    }),
    { ...VACIO },
  );
}

/**
 * Calcula la distribución a partir de una factura ya desglosada.
 *
 * @param {object} facturaEntrada
 *   { acueducto, alcantarillado, aseoResidencial, aseoComercial,
 *     iluminacion, otrosComunes, particulares:{...} }
 * @param {object} configEntrada
 */
export function calcular(facturaEntrada, configEntrada) {
  const config = configConDefaults(configEntrada);

  const factura = {
    acueducto: Number(facturaEntrada.acueducto) || 0,
    alcantarillado: Number(facturaEntrada.alcantarillado) || 0,
    aseoResidencial: Number(facturaEntrada.aseoResidencial) || 0,
    aseoComercial: Number(facturaEntrada.aseoComercial) || 0,
    iluminacion: Number(facturaEntrada.iluminacion) || 0,
    otrosComunes: Number(facturaEntrada.otrosComunes) || 0,
    particulares: {
      residencial: Number(facturaEntrada.particulares?.residencial) || 0,
      odontologia: Number(facturaEntrada.particulares?.odontologia) || 0,
      restaurante: Number(facturaEntrada.particulares?.restaurante) || 0,
    },
  };

  const bloques = [
    distribuirAcueducto(factura, config),
    distribuirAseo(factura, config),
    distribuirComunes(factura, config),
    distribuirParticulares(factura, config),
  ];

  const totales = sumarRepartos(bloques);
  const totalFactura = bloques.reduce((a, b) => a + b.total, 0);

  const escenarios = bloques.flatMap((b) =>
    b.escenarios.map((e) => ({ ...e, concepto: b.concepto })),
  );

  const comparativo = compararConLineaBase(bloques, totales, totalFactura);

  return {
    config,
    factura,
    bloques,
    totales,
    totalFactura,
    porcentajes: {
      residencial: totalFactura ? (totales.residencial / totalFactura) * 100 : 0,
      odontologia: totalFactura ? (totales.odontologia / totalFactura) * 100 : 0,
      restaurante: totalFactura ? (totales.restaurante / totalFactura) * 100 : 0,
    },
    escenarios,
    comparativo,
    cuadra: totales.residencial + totales.odontologia + totales.restaurante === totalFactura,
  };
}

/**
 * Modo 1: se conoce sólo el total de la factura.
 * Se desglosa con los pesos de la línea base y luego se aplican las reglas.
 */
export function calcularDesdeTotal(totalFactura, configEntrada, particulares = {}) {
  const config = configConDefaults(configEntrada);
  const desglose = desglosarPorLineaBase(totalFactura, config, particulares);
  const resultado = calcular(desglose.factura, config);
  return { ...resultado, desglose, modo: 'total' };
}

/** Comparación contra lo que se pagaba antes del restaurante. */
function compararConLineaBase(bloques, totales, totalFactura) {
  const aa = bloques.find((b) => b.id === 'acueducto');
  const aseo = bloques.find((b) => b.id === 'aseo');

  // Antes del restaurante: acueducto y alcantarillado se dividían entre dos,
  // el aseo residencial era de residencial y el comercial de odontología.
  const antes = {
    residencial: Math.round(BASE_AA / 2 + LINEA_BASE.aseoResidencial + LINEA_BASE.iluminacion / 2),
    odontologia: Math.round(BASE_AA / 2 + LINEA_BASE.aseoComercial + LINEA_BASE.iluminacion / 2),
    restaurante: 0,
  };

  return {
    antes,
    ahora: totales,
    variacion: {
      residencial: totales.residencial - antes.residencial,
      odontologia: totales.odontologia - antes.odontologia,
      restaurante: totales.restaurante,
    },
    totalLineaBase: BASE_TOTAL,
    variacionFactura: totalFactura - BASE_TOTAL,
    baseAA: aa?.baseIndexada ?? BASE_AA,
    baseAseo: (aseo?.baseIndexada ?? LINEA_BASE.aseoComercial) + LINEA_BASE.aseoResidencial,
    totalBaseAseo: BASE_ASEO,
  };
}
