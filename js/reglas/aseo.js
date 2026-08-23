/**
 * reglas/aseo.js
 * Distribución del aseo. Numerales 4 y 5 del acuerdo.
 *
 * El componente residencial lo paga siempre residencial (es su propio consumo).
 * El componente comercial se reparte entre odontología y restaurante,
 * con referencia inicial 35% / 65%.
 *
 * Sin margen de tolerancia: cualquier valor por encima del histórico es incremento.
 */

import { LINEA_BASE, factorTarifa } from '../config.js';
import { repartir, cuadrar } from '../redondeo.js';

const cop = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function distribuirAseo(factura, config) {
  const residencial = Math.max(0, Number(factura.aseoResidencial) || 0);
  const comercial = Math.max(0, Number(factura.aseoComercial) || 0);
  const total = residencial + comercial;

  const f = factorTarifa(config.tarifas?.aseo);
  const baseComNominal = LINEA_BASE.aseoComercial;
  const baseComIndexada = baseComNominal * f;
  const ajusteTarifario = baseComIndexada - baseComNominal;

  const pctOdo = Number(config.pctOdontologiaAseo) || 35;
  const pctRes = Number(config.pctRestauranteAseo) || 65;

  const diferencia = comercial - baseComIndexada;

  const escenarios = [];
  let odontologia;
  let restaurante;

  if (ajusteTarifario >= 1) {
    escenarios.push({
      codigo: 'Aseo-C',
      numeral: 'Numeral 2 · Escenario C',
      tono: 'info',
      titulo: 'Ajuste tarifario de aseo aplicado',
      descripcion:
        `La tarifa de aseo subió, así que el histórico comercial se actualizó de ` +
        `${cop(baseComNominal)} a ${cop(baseComIndexada)} antes de comparar.`,
    });
  }

  if (diferencia >= 1 && config.incrementoAseoAlRestaurante) {
    // Numeral 5: el incremento sobre el histórico lo asume el restaurante.
    const [o, r] = repartir(baseComIndexada, [pctOdo, pctRes]);
    odontologia = o;
    restaurante = r + (Math.round(comercial) - Math.round(baseComIndexada));
    escenarios.push({
      codigo: 'Aseo-B',
      numeral: 'Numeral 5',
      tono: 'alerta',
      titulo: 'El aseo aumentó y el incremento se atribuye al restaurante',
      descripcion:
        `El componente comercial supera el histórico en ${cop(diferencia)}. Como hay evidencia de ` +
        `que ese aumento viene de los residuos del restaurante, el histórico se reparte ` +
        `${pctOdo}% / ${pctRes}% y el incremento completo lo asume el restaurante.`,
    });
  } else {
    const [o, r] = repartir(comercial, [pctOdo, pctRes]);
    odontologia = o;
    restaurante = r;

    if (diferencia >= 1) {
      escenarios.push({
        codigo: 'Aseo-A2',
        numeral: 'Numeral 4',
        tono: 'alerta',
        titulo: 'El aseo aumentó — reparto inicial 35% / 65%',
        descripcion:
          `El componente comercial subió ${cop(diferencia)} sobre el histórico, pero todavía no hay ` +
          `evidencia de que el incremento venga del restaurante. Se aplica el reparto inicial ` +
          `${pctOdo}% / ${pctRes}% sobre todo el componente comercial. Si se demuestra el origen, ` +
          `marque la casilla correspondiente y el incremento pasa completo al restaurante.`,
      });
    } else if (diferencia <= -1) {
      escenarios.push({
        codigo: 'Aseo-A3',
        numeral: 'Numeral 4',
        tono: 'ok',
        titulo: 'El aseo bajó — reparto proporcional 35% / 65%',
        descripcion:
          `El componente comercial está ${cop(Math.abs(diferencia))} por debajo del histórico ` +
          `(${cop(baseComIndexada)}). Sin valor mínimo fijo: se reparte ${pctOdo}% / ${pctRes}% ` +
          `y ambos pagan menos.`,
      });
    } else {
      escenarios.push({
        codigo: 'Aseo-A',
        numeral: 'Numeral 4',
        tono: 'ok',
        titulo: 'El aseo se mantiene — reparto 35% / 65%',
        descripcion:
          `El componente comercial coincide con el histórico (${cop(baseComIndexada)}). ` +
          `Odontología asume el ${pctOdo}% y el restaurante el ${pctRes}%.`,
      });
    }
  }

  const baseResIndexada = LINEA_BASE.aseoResidencial * f;
  const difResidencial = residencial - baseResIndexada;
  if (Math.abs(difResidencial) >= 1) {
    escenarios.push({
      codigo: 'Aseo-R',
      numeral: 'Numeral 4',
      tono: 'info',
      titulo:
        difResidencial > 0
          ? 'El aseo residencial subió frente al histórico'
          : 'El aseo residencial bajó frente al histórico',
      descripcion:
        `El componente residencial es ${cop(residencial)} frente a ${cop(baseResIndexada)} del ` +
        `histórico (${difResidencial > 0 ? '+' : '−'}${cop(Math.abs(difResidencial))}). Ese componente ` +
        `lo asume íntegramente la unidad residencial, porque corresponde a su propio consumo.`,
    });
  }

  const valores = cuadrar([Math.round(residencial), odontologia, restaurante], Math.round(total));

  return {
    id: 'aseo',
    concepto: 'Aseo',
    total: Math.round(total),
    detalle: { residencial: Math.round(residencial), comercial: Math.round(comercial) },
    baseNominal: Math.round(baseComNominal),
    baseIndexada: Math.round(baseComIndexada),
    ajusteTarifario: Math.round(ajusteTarifario),
    diferencia: Math.round(diferencia),
    reparto: { residencial: valores[0], odontologia: valores[1], restaurante: valores[2] },
    escenarios,
  };
}
