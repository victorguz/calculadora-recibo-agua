/**
 * reglas/particulares.js
 * Multas, intereses, acuerdos de pago y reparaciones generadas por una sola unidad.
 * Numeral 8: los asume íntegramente quien los generó.
 */

export function distribuirParticulares(factura, _config) {
  const p = factura.particulares || {};
  const residencial = Math.max(0, Math.round(Number(p.residencial) || 0));
  const odontologia = Math.max(0, Math.round(Number(p.odontologia) || 0));
  const restaurante = Math.max(0, Math.round(Number(p.restaurante) || 0));
  const total = residencial + odontologia + restaurante;

  const escenarios = [];
  if (total > 0) {
    const quienes = [];
    if (residencial > 0) quienes.push(`residencial $${residencial.toLocaleString('es-CO')}`);
    if (odontologia > 0) quienes.push(`odontología $${odontologia.toLocaleString('es-CO')}`);
    if (restaurante > 0) quienes.push(`restaurante $${restaurante.toLocaleString('es-CO')}`);
    escenarios.push({
      codigo: 'Particulares',
      numeral: 'Numeral 8',
      tono: 'info',
      titulo: 'Gastos propios cargados a quien los generó',
      descripcion:
        `Multas, intereses, acuerdos de pago o reparaciones exclusivos de una unidad no se reparten: ` +
        `${quienes.join(', ')}.`,
    });
  }

  return {
    id: 'particulares',
    concepto: 'Otros conceptos particulares',
    total,
    detalle: { residencial, odontologia, restaurante },
    reparto: { residencial, odontologia, restaurante },
    escenarios,
  };
}
