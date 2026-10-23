/**
 * desglose.js
 * Arma el desglose de la factura a partir de lo que haya diligenciado el usuario.
 *
 * Aseo e iluminación traen por defecto el valor de la factura más reciente, no el
 * de la línea base: desde octubre de 2026 el aseo cambió de nivel y ya no sirve el
 * dato de julio. Cuando se digita el total de la factura, la diferencia contra esos
 * conceptos se atribuye al consumo de acueducto y alcantarillado.
 *
 * Ojo: si el aseo del mes llega distinto al sugerido, hay que corregirlo a mano;
 * de lo contrario la diferencia se le carga al acueducto.
 */

import { LINEA_BASE, VALORES_SUGERIDOS, factorTarifa } from './config.js';
import { repartir } from './redondeo.js';

function positivo(valor) {
  return Math.max(0, Math.round(Number(valor) || 0));
}

/** Vacío o ausente toma el valor sugerido; un 0 explícito se respeta. */
function valorODefecto(valor, porDefecto) {
  if (valor === undefined || valor === null || valor === '') return positivo(porDefecto);
  return positivo(valor);
}

/**
 * @param {object} entrada
 *   total            valor total de la factura, o null para sumar los conceptos
 *   acueducto        sólo se usa cuando no hay total
 *   alcantarillado   sólo se usa cuando no hay total
 *   aseoResidencial, aseoComercial, iluminacion, otrosComunes
 *   particulares     { residencial, odontologia, restaurante }
 * @param {object} config
 */
export function construirFactura(entrada, config) {
  const aseoResidencial = valorODefecto(entrada.aseoResidencial, VALORES_SUGERIDOS.aseoResidencial);
  const aseoComercial = valorODefecto(entrada.aseoComercial, VALORES_SUGERIDOS.aseoComercial);
  const iluminacion = valorODefecto(entrada.iluminacion, VALORES_SUGERIDOS.iluminacion);
  const otrosComunes = positivo(entrada.otrosComunes);

  const particulares = {
    residencial: positivo(entrada.particulares?.residencial),
    odontologia: positivo(entrada.particulares?.odontologia),
    restaurante: positivo(entrada.particulares?.restaurante),
  };
  const sumaParticulares =
    particulares.residencial + particulares.odontologia + particulares.restaurante;

  const fijos = aseoResidencial + aseoComercial + iluminacion + otrosComunes + sumaParticulares;

  // Sin total: manda lo que se digitó concepto por concepto.
  if (entrada.total === null || entrada.total === undefined || entrada.total === '') {
    const acueducto = valorODefecto(entrada.acueducto, LINEA_BASE.acueducto);
    const alcantarillado = valorODefecto(entrada.alcantarillado, LINEA_BASE.alcantarillado);
    return {
      modo: 'conceptos',
      insuficiente: false,
      faltante: 0,
      consumoDerivado: acueducto + alcantarillado,
      factura: {
        acueducto,
        alcantarillado,
        aseoResidencial,
        aseoComercial,
        iluminacion,
        otrosComunes,
        particulares,
      },
      total: acueducto + alcantarillado + fijos,
    };
  }

  // Con total: el consumo de acueducto y alcantarillado es lo que sobra.
  const total = positivo(entrada.total);
  const consumo = total - fijos;
  const insuficiente = consumo < 0;

  const fAcu = factorTarifa(config?.tarifas?.acueducto);
  const fAlc = factorTarifa(config?.tarifas?.alcantarillado);
  const [acueducto, alcantarillado] = repartir(Math.max(0, consumo), [
    LINEA_BASE.acueducto * fAcu,
    LINEA_BASE.alcantarillado * fAlc,
  ]);

  return {
    modo: 'total',
    insuficiente,
    faltante: insuficiente ? Math.abs(consumo) : 0,
    consumoDerivado: Math.max(0, consumo),
    factura: {
      acueducto,
      alcantarillado,
      aseoResidencial,
      aseoComercial,
      iluminacion,
      otrosComunes,
      particulares,
    },
    total: insuficiente ? fijos : total,
  };
}
