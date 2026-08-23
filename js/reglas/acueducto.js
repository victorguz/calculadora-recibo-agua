/**
 * reglas/acueducto.js
 * Distribución de acueducto + alcantarillado.
 * Numerales 2 y 3 del acuerdo (escenarios A, B, C y ajuste progresivo).
 *
 * No hay margen de tolerancia: cualquier valor por encima de la línea base es
 * incremento y lo asume el restaurante.
 */

import { LINEA_BASE, factorTarifa } from '../config.js';
import { repartir, repartirIgual, cuadrar } from '../redondeo.js';

const TERCIO = 100 / 3; // 33,3333...

const cop = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;

/**
 * @param {{acueducto:number, alcantarillado:number}} factura
 * @param {object} config
 * @returns {object} resultado del concepto
 */
export function distribuirAcueducto(factura, config) {
  const acueducto = Math.max(0, Number(factura.acueducto) || 0);
  const alcantarillado = Math.max(0, Number(factura.alcantarillado) || 0);
  const total = acueducto + alcantarillado;

  const fAcu = factorTarifa(config.tarifas?.acueducto);
  const fAlc = factorTarifa(config.tarifas?.alcantarillado);

  const baseNominal = LINEA_BASE.acueducto + LINEA_BASE.alcantarillado;
  const baseIndexada = LINEA_BASE.acueducto * fAcu + LINEA_BASE.alcantarillado * fAlc;
  const ajusteTarifario = baseIndexada - baseNominal;

  const diferencia = total - baseIndexada;

  const escenarios = [];
  let reparto;

  if (ajusteTarifario >= 1) {
    escenarios.push({
      codigo: 'C',
      numeral: 'Numeral 2 · Escenario C',
      tono: 'info',
      titulo: 'Ajuste tarifario aplicado',
      descripcion:
        `El valor del m³ subió, así que la línea base se actualizó de ${cop(baseNominal)} a ` +
        `${cop(baseIndexada)}. Ese mayor valor por tarifa no se le carga al restaurante: ` +
        `se reparte entre las tres partes.`,
    });
  }

  if (diferencia >= 1) {
    // El consumo subió sobre la línea base: todo el incremento es del restaurante.
    if (config.consumoHabitualDemostrado) {
      const [r, o] = repartirIgual(baseIndexada, 3);
      const tercioRestante = Math.round(baseIndexada) - r - o;
      reparto = {
        residencial: r,
        odontologia: o,
        restaurante: tercioRestante + (Math.round(total) - Math.round(baseIndexada)),
      };
      escenarios.push({
        codigo: 'B',
        numeral: 'Numeral 2 · Escenario B',
        tono: 'alerta',
        titulo: 'El consumo aumentó — el incremento lo asume el restaurante',
        descripcion:
          `La factura de acueducto + alcantarillado supera la línea base en ${cop(diferencia)}. ` +
          `Residencial y odontología mantienen su consumo habitual, así que cada una paga su tercio ` +
          `de la línea base (${cop(r)}) y el restaurante asume el incremento completo.`,
      });
    } else {
      const [r, o, res] = repartirIgual(total, 3);
      reparto = { residencial: r, odontologia: o, restaurante: res };
      escenarios.push({
        codigo: 'B-sin-evidencia',
        numeral: 'Numeral 2 · Escenario B (condición no cumplida)',
        tono: 'alerta',
        titulo: 'El consumo aumentó, pero el incremento no es atribuible',
        descripcion:
          `Hay un incremento de ${cop(diferencia)} sobre la línea base, pero no se marcó que ` +
          `residencial y odontología mantengan su consumo habitual. Sin esa condición el incremento ` +
          `no se le puede cargar al restaurante, así que el total se divide en partes iguales.`,
      });
    }
  } else if (diferencia <= -1) {
    const [r, o, res] = repartirIgual(total, 3);
    reparto = { residencial: r, odontologia: o, restaurante: res };
    escenarios.push({
      codigo: 'A-baja',
      numeral: 'Numeral 5 del resumen',
      tono: 'ok',
      titulo: 'El consumo bajó — reparto en partes iguales',
      descripcion:
        `La factura está ${cop(Math.abs(diferencia))} por debajo de la línea base ` +
        `(${cop(baseIndexada)}). El restaurante no tiene un valor mínimo fijo: se divide entre tres ` +
        `y todos pagan menos.`,
    });
  } else {
    const [r, o, res] = repartirIgual(total, 3);
    reparto = { residencial: r, odontologia: o, restaurante: res };
    escenarios.push({
      codigo: 'A',
      numeral: 'Numeral 2 · Escenario A',
      tono: 'ok',
      titulo: 'El consumo se mantiene — partes iguales',
      descripcion:
        `La factura coincide con la línea base (${cop(baseIndexada)}), así que no hubo incremento. ` +
        `Se divide entre tres y el restaurante paga su parte aunque no haya generado aumento.`,
    });
  }

  // Ajuste progresivo (numeral 3): sólo aplica si la revisión semestral
  // le asignó al restaurante una participación mayor al 33,33%.
  const pct = Number(config.pctRestauranteAA) || TERCIO;
  if (pct > TERCIO + 0.01) {
    const restProgresivo = Math.round((total * pct) / 100);
    const pctTexto = pct.toFixed(2).replace('.', ',');
    if (restProgresivo > reparto.restaurante) {
      const [r, o] = repartir(Math.round(total) - restProgresivo, [1, 1]);
      reparto = { residencial: r, odontologia: o, restaurante: restProgresivo };
      escenarios.push({
        codigo: 'D',
        numeral: 'Numeral 3',
        tono: 'alerta',
        titulo: `Ajuste progresivo: el restaurante asume el ${pctTexto}%`,
        descripcion:
          `La revisión semestral elevó la participación del restaurante al ${pctTexto}% del ` +
          `acueducto y alcantarillado. Como ese porcentaje resulta mayor que lo que le correspondería ` +
          `por el incremento, manda el ajuste progresivo y el resto se divide entre residencial y odontología.`,
      });
    } else {
      escenarios.push({
        codigo: 'D-no-aplica',
        numeral: 'Numeral 3',
        tono: 'info',
        titulo: `Ajuste progresivo configurado (${pctTexto}%) pero no aplicado`,
        descripcion:
          `Con el incremento de este período al restaurante ya le corresponde más de lo que daría ` +
          `el ${pctTexto}%, así que se mantiene el cálculo por incremento.`,
      });
    }
  }

  const valores = cuadrar(
    [reparto.residencial, reparto.odontologia, reparto.restaurante],
    Math.round(total),
  );

  return {
    id: 'acueducto',
    concepto: 'Acueducto y alcantarillado',
    total: Math.round(total),
    detalle: { acueducto: Math.round(acueducto), alcantarillado: Math.round(alcantarillado) },
    baseNominal: Math.round(baseNominal),
    baseIndexada: Math.round(baseIndexada),
    ajusteTarifario: Math.round(ajusteTarifario),
    diferencia: Math.round(diferencia),
    reparto: { residencial: valores[0], odontologia: valores[1], restaurante: valores[2] },
    escenarios,
  };
}
