/**
 * reglas/aseo.js
 * Distribución del aseo. Numerales 4 y 5 del acuerdo.
 *
 * El componente residencial lo paga siempre residencial (es su propio consumo).
 * El componente comercial se reparte entre odontología y restaurante,
 * con referencia inicial 35% / 65%.
 */

import { LINEA_BASE, factorTarifa } from '../config.js';
import { repartir, cuadrar } from '../redondeo.js';

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

  const tolerancia = (baseComIndexada * (Number(config.toleranciaPct) || 0)) / 100;
  const diferencia = comercial - baseComIndexada;

  const escenarios = [];
  let odontologia;
  let restaurante;

  if (ajusteTarifario > 0.5) {
    escenarios.push({
      codigo: 'Aseo-C',
      numeral: 'Numeral 2 · Escenario C',
      tono: 'info',
      titulo: 'Ajuste tarifario de aseo aplicado',
      descripcion:
        `La tarifa de aseo subió, así que el histórico comercial se actualizó de ` +
        `$${Math.round(baseComNominal).toLocaleString('es-CO')} a ` +
        `$${Math.round(baseComIndexada).toLocaleString('es-CO')} antes de comparar.`,
    });
  }

  if (diferencia > tolerancia && config.incrementoAseoAlRestaurante) {
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
        `El componente comercial supera el histórico en ` +
        `$${Math.round(diferencia).toLocaleString('es-CO')}. ` +
        `Como hay evidencia de que ese aumento viene de los residuos del restaurante, ` +
        `el histórico se reparte ${pctOdo}% / ${pctRes}% y el incremento completo lo asume el restaurante.`,
    });
  } else {
    const [o, r] = repartir(comercial, [pctOdo, pctRes]);
    odontologia = o;
    restaurante = r;

    if (diferencia > tolerancia) {
      escenarios.push({
        codigo: 'Aseo-A2',
        numeral: 'Numeral 4',
        tono: 'alerta',
        titulo: 'El aseo aumentó — reparto inicial 35% / 65%',
        descripcion:
          `El componente comercial subió $${Math.round(diferencia).toLocaleString('es-CO')} sobre el histórico, ` +
          `pero todavía no hay evidencia de que el incremento venga del restaurante. ` +
          `Se aplica el reparto inicial ${pctOdo}% / ${pctRes}% sobre todo el componente comercial. ` +
          `Si se demuestra el origen, marque la casilla correspondiente y el incremento pasa completo al restaurante.`,
      });
    } else if (diferencia < -tolerancia) {
      escenarios.push({
        codigo: 'Aseo-A3',
        numeral: 'Numeral 4',
        tono: 'ok',
        titulo: 'El aseo bajó — reparto proporcional 35% / 65%',
        descripcion:
          `El componente comercial está $${Math.abs(Math.round(diferencia)).toLocaleString('es-CO')} por debajo ` +
          `del histórico. Sin valor mínimo fijo: se reparte ${pctOdo}% / ${pctRes}% y ambos pagan menos.`,
      });
    } else {
      escenarios.push({
        codigo: 'Aseo-A',
        numeral: 'Numeral 4',
        tono: 'ok',
        titulo: 'El aseo se mantiene — reparto 35% / 65%',
        descripcion:
          `El componente comercial está dentro del margen de ±${config.toleranciaPct}% del histórico ` +
          `($${Math.round(baseComIndexada).toLocaleString('es-CO')}). ` +
          `Odontología asume el ${pctOdo}% y el restaurante el ${pctRes}%.`,
      });
    }
  }

  const difResidencial = residencial - LINEA_BASE.aseoResidencial * f;
  if (Math.abs(difResidencial) > (LINEA_BASE.aseoResidencial * f * (Number(config.toleranciaPct) || 0)) / 100) {
    escenarios.push({
      codigo: 'Aseo-R',
      numeral: 'Numeral 4',
      tono: 'info',
      titulo:
        difResidencial > 0
          ? 'El aseo residencial subió frente al histórico'
          : 'El aseo residencial bajó frente al histórico',
      descripcion:
        `El componente residencial facturado es $${Math.round(residencial).toLocaleString('es-CO')} ` +
        `frente a $${Math.round(LINEA_BASE.aseoResidencial * f).toLocaleString('es-CO')} del histórico ` +
        `(${difResidencial > 0 ? '+' : ''}$${Math.round(difResidencial).toLocaleString('es-CO')}). ` +
        `Ese componente lo asume íntegramente la unidad residencial, porque corresponde a su propio consumo.`,
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
    tolerancia: Math.round(tolerancia),
    reparto: { residencial: valores[0], odontologia: valores[1], restaurante: valores[2] },
    escenarios,
  };
}
