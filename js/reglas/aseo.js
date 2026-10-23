/**
 * reglas/aseo.js
 * Distribución del aseo. Numerales 4 y 5 del acuerdo, con el ajuste de
 * octubre de 2026 sobre el cargo fijo (ver ACUERDO_CARGO_FIJO en config.js).
 *
 * El componente residencial lo paga siempre residencial: es su propio consumo.
 *
 * El componente comercial se parte en dos:
 *   - Cargo fijo: cada local comercial asume el suyo. No se reparte.
 *   - Consumo (toneladas): el histórico se reparte 35% / 65%, y todo el
 *     aumento sobre ese histórico lo asume el restaurante.
 *
 * Sin margen de tolerancia: cualquier peso por encima del histórico es aumento.
 */

import { LINEA_BASE, REFERENCIA_ASEO, factorTarifa } from '../config.js';
import { repartir, cuadrar } from '../redondeo.js';

const cop = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function distribuirAseo(factura, config) {
  const residencial = Math.max(0, Number(factura.aseoResidencial) || 0);
  const comercial = Math.max(0, Number(factura.aseoComercial) || 0);
  const total = residencial + comercial;

  const f = factorTarifa(config.tarifas?.aseo);
  const pctOdo = Number(config.pctOdontologiaAseo) || 35;
  const pctRes = Number(config.pctRestauranteAseo) || 65;

  const cargoFijoUnitario = Math.max(0, Number(config.cargoFijoComercial) || 0);
  const locales = Math.max(0, Math.round(Number(config.localesComerciales) || 0));

  const escenarios = [];

  // Cargo fijo que cobra la factura por los locales comerciales.
  const cargoFijoTotal = Math.min(Math.round(comercial), cargoFijoUnitario * locales);
  const cargoFijoRecortado = cargoFijoUnitario * locales > Math.round(comercial);

  // Lo que queda es el consumo por toneladas.
  const consumo = Math.round(comercial) - cargoFijoTotal;
  const consumoHistorico =
    Math.max(0, Number(config.consumoComercialHistorico) || REFERENCIA_ASEO.consumoComercial) * f;
  const aumentoConsumo = consumo - consumoHistorico;

  // --- Reparto del cargo fijo: uno para la odontología, el resto al restaurante.
  const cargoFijoOdo = locales >= 1 ? Math.min(cargoFijoUnitario, cargoFijoTotal) : 0;
  const cargoFijoRest = cargoFijoTotal - cargoFijoOdo;

  if (locales >= 2) {
    escenarios.push({
      codigo: 'Aseo-CF',
      numeral: 'Acuerdo de octubre 2026',
      tono: 'info',
      titulo: 'Cada local comercial paga su propio cargo fijo',
      descripcion:
        `La factura cobra ${locales} cargos fijos comerciales de ${cop(cargoFijoUnitario)} cada uno ` +
        `(${cop(cargoFijoTotal)} en total). Desde que Triple A registró los dos locales, este cargo ` +
        `ya no se divide ${pctOdo}/${pctRes}: la odontología asume ${cop(cargoFijoOdo)} y el ` +
        `restaurante ${cop(cargoFijoRest)}.`,
    });
  } else if (locales === 1) {
    escenarios.push({
      codigo: 'Aseo-CF1',
      numeral: 'Acuerdo de octubre 2026',
      tono: 'info',
      titulo: 'La factura cobra un solo cargo fijo comercial',
      descripcion:
        `Hay un único cargo fijo comercial de ${cop(cargoFijoUnitario)} y lo asume la odontología, ` +
        `que es el local registrado. Si la factura empieza a cobrar dos, suba el número de locales.`,
    });
  }

  if (cargoFijoRecortado) {
    escenarios.push({
      codigo: 'Aseo-CF-aviso',
      numeral: 'Revisar los datos',
      tono: 'alerta',
      titulo: 'El cargo fijo configurado no cabe en el aseo comercial',
      descripcion:
        `${locales} locales a ${cop(cargoFijoUnitario)} suman ${cop(cargoFijoUnitario * locales)}, ` +
        `más que el aseo comercial de ${cop(comercial)}. Se usó el valor facturado y el consumo ` +
        `quedó en $0. Revise el cargo fijo o el número de locales.`,
    });
  }

  // --- Ajuste tarifario sobre el consumo histórico.
  if (f > 1) {
    escenarios.push({
      codigo: 'Aseo-C',
      numeral: 'Numeral 2 · Escenario C',
      tono: 'info',
      titulo: 'Ajuste tarifario de aseo aplicado',
      descripcion:
        `La tarifa de aseo subió, así que el consumo histórico se actualizó de ` +
        `${cop(config.consumoComercialHistorico)} a ${cop(consumoHistorico)} antes de comparar.`,
    });
  }

  // --- Reparto del consumo.
  let consumoOdo;
  let consumoRest;

  if (aumentoConsumo >= 1 && config.incrementoAseoAlRestaurante) {
    const [o, r] = repartir(Math.min(consumo, consumoHistorico), [pctOdo, pctRes]);
    consumoOdo = o;
    consumoRest = r + (consumo - Math.round(Math.min(consumo, consumoHistorico)));
    escenarios.push({
      codigo: 'Aseo-B',
      numeral: 'Numeral 5',
      tono: 'alerta',
      titulo: 'El consumo de aseo aumentó y el aumento lo asume el restaurante',
      descripcion:
        `El consumo comercial pasó de ${cop(consumoHistorico)} a ${cop(consumo)}: ` +
        `${cop(aumentoConsumo)} más. El residencial mantiene su nivel y la odontología su tonelaje, ` +
        `así que el histórico se reparte ${pctOdo}% / ${pctRes}% y todo el aumento lo asume el restaurante.`,
    });
  } else {
    const [o, r] = repartir(consumo, [pctOdo, pctRes]);
    consumoOdo = o;
    consumoRest = r;

    if (aumentoConsumo >= 1) {
      escenarios.push({
        codigo: 'Aseo-A2',
        numeral: 'Numeral 4',
        tono: 'alerta',
        titulo: 'El consumo aumentó — reparto 35% / 65% sin atribuir el aumento',
        descripcion:
          `El consumo comercial subió ${cop(aumentoConsumo)} sobre el histórico, pero no se marcó que ` +
          `haya evidencia de que venga del restaurante. Todo el consumo se reparte ${pctOdo}% / ${pctRes}%. ` +
          `Si se demuestra el origen, marque la casilla y el aumento pasa completo al restaurante.`,
      });
    } else if (aumentoConsumo <= -1) {
      escenarios.push({
        codigo: 'Aseo-A3',
        numeral: 'Numeral 4',
        tono: 'ok',
        titulo: 'El consumo de aseo bajó — reparto 35% / 65%',
        descripcion:
          `El consumo comercial está ${cop(Math.abs(aumentoConsumo))} por debajo del histórico ` +
          `(${cop(consumoHistorico)}). Sin valor mínimo fijo: se reparte ${pctOdo}% / ${pctRes}% ` +
          `y ambos pagan menos.`,
      });
    } else {
      escenarios.push({
        codigo: 'Aseo-A',
        numeral: 'Numeral 4',
        tono: 'ok',
        titulo: 'El consumo de aseo se mantiene — reparto 35% / 65%',
        descripcion:
          `El consumo comercial coincide con el histórico (${cop(consumoHistorico)}). ` +
          `Odontología asume el ${pctOdo}% y el restaurante el ${pctRes}%.`,
      });
    }
  }

  // --- Componente residencial.
  // El aviso es informativo y no mueve el reparto: el residencial siempre asume
  // lo suyo. Por eso aquí sí hay un umbral, para no avisar por unos pesos de redondeo.
  const UMBRAL_AVISO_RESIDENCIAL = 1000;
  const baseResIndexada = REFERENCIA_ASEO.residencial * f;
  const difResidencial = residencial - baseResIndexada;
  if (Math.abs(difResidencial) >= UMBRAL_AVISO_RESIDENCIAL) {
    escenarios.push({
      codigo: 'Aseo-R',
      numeral: 'Numeral 4',
      tono: 'info',
      titulo:
        difResidencial > 0
          ? 'El aseo residencial subió frente a su referencia'
          : 'El aseo residencial bajó frente a su referencia',
      descripcion:
        `El componente residencial es ${cop(residencial)} frente a ${cop(baseResIndexada)} de ` +
        `${REFERENCIA_ASEO.periodo} (${difResidencial > 0 ? '+' : '−'}${cop(Math.abs(difResidencial))}). ` +
        `Lo asume íntegramente la unidad residencial, porque corresponde a su propio consumo.`,
    });
  }

  const odontologia = cargoFijoOdo + consumoOdo;
  const restaurante = cargoFijoRest + consumoRest;
  const valores = cuadrar([Math.round(residencial), odontologia, restaurante], Math.round(total));

  return {
    id: 'aseo',
    concepto: 'Aseo',
    total: Math.round(total),
    detalle: { residencial: Math.round(residencial), comercial: Math.round(comercial) },
    cargoFijo: {
      unitario: cargoFijoUnitario,
      locales,
      total: cargoFijoTotal,
      odontologia: cargoFijoOdo,
      restaurante: cargoFijoRest,
    },
    consumo: {
      actual: consumo,
      historico: Math.round(consumoHistorico),
      aumento: Math.round(aumentoConsumo),
      odontologia: consumoOdo,
      restaurante: consumoRest,
    },
    // Compatibilidad con el resto de la app: la referencia del componente comercial.
    baseNominal: Math.round(REFERENCIA_ASEO.comercial),
    baseIndexada: Math.round(cargoFijoUnitario * locales + consumoHistorico),
    ajusteTarifario: Math.round(consumoHistorico - (Number(config.consumoComercialHistorico) || 0)),
    diferencia: Math.round(aumentoConsumo),
    reparto: { residencial: valores[0], odontologia: valores[1], restaurante: valores[2] },
    escenarios,
  };
}

/** Exportado para las pruebas y para la vista de detalle. */
export const REFERENCIAS_ASEO = { LINEA_BASE, REFERENCIA_ASEO };
