/**
 * reglas/comunes.js
 * Iluminación y demás conceptos que benefician por igual a las tres unidades.
 * Numerales 6 y 7 del acuerdo: se dividen en partes iguales.
 */

import { repartirIgual } from '../redondeo.js';

export function distribuirComunes(factura, _config) {
  const iluminacion = Math.max(0, Number(factura.iluminacion) || 0);
  const otros = Math.max(0, Number(factura.otrosComunes) || 0);
  const total = iluminacion + otros;

  const [r, o, res] = repartirIgual(total, 3);

  const escenarios = [];
  if (total > 0) {
    escenarios.push({
      codigo: 'Comunes',
      numeral: 'Numerales 6 y 7',
      tono: 'ok',
      titulo: 'Conceptos comunes divididos en partes iguales',
      descripcion:
        `Iluminación${otros > 0 ? ' y otros conceptos comunes' : ''} por ` +
        `$${Math.round(total).toLocaleString('es-CO')} se dividen entre tres: ` +
        `$${r.toLocaleString('es-CO')} para cada unidad, porque benefician por igual a todas.`,
    });
  }

  return {
    id: 'comunes',
    concepto: 'Iluminación y comunes',
    total: Math.round(total),
    detalle: { iluminacion: Math.round(iluminacion), otros: Math.round(otros) },
    reparto: { residencial: r, odontologia: o, restaurante: res },
    escenarios,
  };
}
