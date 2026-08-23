/**
 * Pruebas del motor contra los ejemplos numéricos del acuerdo.
 * Ejecutar con: node test/motor.test.js
 */
import assert from 'node:assert/strict';
import { calcular, calcularDesdeFormulario } from '../js/motor.js';
import { LINEA_BASE, BASE_TOTAL, BASE_AA } from '../js/config.js';

let ok = 0;
function prueba(nombre, fn) {
  try {
    fn();
    ok += 1;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`FALLA  ${nombre}\n       ${e.message}`);
    process.exitCode = 1;
  }
}

const facturaBase = {
  acueducto: LINEA_BASE.acueducto,
  alcantarillado: LINEA_BASE.alcantarillado,
  aseoResidencial: LINEA_BASE.aseoResidencial,
  aseoComercial: LINEA_BASE.aseoComercial,
  iluminacion: LINEA_BASE.iluminacion,
};

const bloque = (r, id) => r.bloques.find((b) => b.id === id);
const suma = (t) => t.residencial + t.odontologia + t.restaurante;

/* ------------------------- acueducto y alcantarillado ------------------------- */

prueba('Escenario A: factura igual a la línea base', () => {
  const aa = bloque(calcular(facturaBase, {}), 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'A');
  assert.deepEqual(aa.reparto, { residencial: 45035, odontologia: 45035, restaurante: 45035 });
});

prueba('Escenario B: acueducto+alcantarillado en 200.000', () => {
  const aa = bloque(calcular({ ...facturaBase, acueducto: 120000, alcantarillado: 80000 }, {}), 'acueducto');
  assert.equal(aa.escenarios.some((e) => e.codigo === 'B'), true);
  assert.deepEqual(aa.reparto, { residencial: 45035, odontologia: 45035, restaurante: 109930 });
});

prueba('Sin tolerancia: un aumento de $2.000 ya es incremento del restaurante', () => {
  const aa = bloque(calcular({ ...facturaBase, acueducto: 86924 }, {}), 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'B');
  assert.equal(aa.reparto.restaurante, 45035 + 2000);
  assert.equal(aa.reparto.residencial, 45035);
});

prueba('Sin tolerancia: una baja de $2.000 se reparte entre tres', () => {
  const aa = bloque(calcular({ ...facturaBase, acueducto: 82924 }, {}), 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'A-baja');
  assert.equal(suma(aa.reparto), 133105);
});

prueba('Escenario B sin evidencia: se divide entre tres', () => {
  const aa = bloque(
    calcular({ ...facturaBase, acueducto: 120000, alcantarillado: 80000 }, { consumoHabitualDemostrado: false }),
    'acueducto',
  );
  assert.equal(aa.escenarios[0].codigo, 'B-sin-evidencia');
  assert.equal(suma(aa.reparto), 200000);
  assert.equal(aa.reparto.restaurante, 66666);
});

prueba('Ajuste progresivo al 50%', () => {
  const aa = bloque(calcular(facturaBase, { pctRestauranteAA: 50 }), 'acueducto');
  assert.equal(aa.escenarios.some((e) => e.codigo === 'D'), true);
  assert.equal(aa.reparto.restaurante, 67553);
  assert.equal(suma(aa.reparto), BASE_AA);
});

prueba('Ajuste tarifario (escenario C) no castiga al restaurante', () => {
  const aa = bloque(
    calcular(
      { ...facturaBase, acueducto: 91718, alcantarillado: 54196 },
      { tarifas: { acueducto: { base: 100, actual: 108 }, alcantarillado: { base: 100, actual: 108 } } },
    ),
    'acueducto',
  );
  assert.equal(aa.escenarios.some((e) => e.codigo === 'C'), true);
  assert.equal(aa.baseIndexada, Math.round(135105 * 1.08));
  // 145.914 contra una base indexada de 145.913: el peso sube para los tres, no sólo el restaurante.
  assert.equal(aa.reparto.residencial, 48638);
  assert.equal(aa.reparto.restaurante, 48638);
});

/* ---------------------------------- aseo ---------------------------------- */

prueba('Aseo 176.030 -> 44.296 / 46.107 / 85.627', () => {
  const aseo = bloque(calcular(facturaBase, {}), 'aseo');
  assert.deepEqual(aseo.reparto, { residencial: 44296, odontologia: 46107, restaurante: 85627 });
});

prueba('Aseo 220.000 con reparto inicial 35/65', () => {
  const aseo = bloque(calcular({ ...facturaBase, aseoComercial: 220000 - 44296 }, {}), 'aseo');
  assert.deepEqual(aseo.reparto, { residencial: 44296, odontologia: 61496, restaurante: 114208 });
  assert.equal(aseo.total, 220000);
});

prueba('Aseo 220.000 con incremento atribuido al restaurante', () => {
  const aseo = bloque(
    calcular({ ...facturaBase, aseoComercial: 220000 - 44296 }, { incrementoAseoAlRestaurante: true }),
    'aseo',
  );
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-B'), true);
  assert.equal(aseo.reparto.odontologia, 46107);
  assert.equal(aseo.reparto.restaurante, 85627 + 43970);
  assert.equal(aseo.total, 220000);
});

/* ------------------------------ otros conceptos ------------------------------ */

prueba('Iluminación 15.000 -> 5.000 cada uno', () => {
  const c = bloque(calcular(facturaBase, {}), 'comunes');
  assert.deepEqual(c.reparto, { residencial: 5000, odontologia: 5000, restaurante: 5000 });
});

prueba('Gastos particulares van a quien los generó', () => {
  const r = calcular({ ...facturaBase, particulares: { odontologia: 50000 } }, {});
  const p = bloque(r, 'particulares');
  assert.equal(p.reparto.odontologia, 50000);
  assert.equal(p.reparto.residencial, 0);
  assert.equal(r.totales.odontologia, 45035 + 46107 + 5000 + 50000);
});

/* --------------------------- formulario unificado --------------------------- */

prueba('Sólo el total, igual a la línea base: reproduce el desglose base', () => {
  const r = calcularDesdeFormulario({ total: BASE_TOTAL }, {});
  assert.equal(r.desglose.modo, 'total');
  assert.equal(r.desglose.consumoDerivado, BASE_AA);
  assert.equal(r.desglose.factura.aseoResidencial, LINEA_BASE.aseoResidencial);
  assert.equal(r.desglose.factura.aseoComercial, LINEA_BASE.aseoComercial);
  assert.equal(r.desglose.factura.iluminacion, LINEA_BASE.iluminacion);
  assert.equal(bloque(r, 'acueducto').escenarios[0].codigo, 'A');
});

prueba('Sólo el total: todo el aumento cae en consumo, no en aseo', () => {
  const r = calcularDesdeFormulario({ total: 400000 }, {});
  const aumento = 400000 - BASE_TOTAL;
  assert.equal(r.desglose.consumoDerivado, BASE_AA + aumento);
  assert.equal(bloque(r, 'aseo').total, 176030);
  assert.equal(bloque(r, 'comunes').total, 15000);
  // El aseo no se movió, así que el incremento completo lo asume el restaurante.
  const aa = bloque(r, 'acueducto');
  assert.equal(aa.reparto.residencial, 45035);
  assert.equal(aa.reparto.odontologia, 45035);
  assert.equal(aa.reparto.restaurante, 45035 + aumento);
  assert.equal(r.totalFactura, 400000);
  assert.equal(suma(r.totales), 400000);
});

prueba('Sólo el total: 300.000 cuadra exacto y todos bajan', () => {
  const r = calcularDesdeFormulario({ total: 300000 }, {});
  assert.equal(r.cuadra, true);
  assert.equal(suma(r.totales), 300000);
  assert.equal(bloque(r, 'acueducto').escenarios[0].codigo, 'A-baja');
});

prueba('Total con aseo comercial ajustado a mano', () => {
  const r = calcularDesdeFormulario({ total: 400000, aseoComercial: 175704 }, {});
  assert.equal(bloque(r, 'aseo').total, 44296 + 175704);
  assert.equal(r.desglose.consumoDerivado, 400000 - 220000 - 15000);
  assert.equal(suma(r.totales), 400000);
});

prueba('Total con gastos particulares: se descuentan antes de derivar el consumo', () => {
  const r = calcularDesdeFormulario({ total: 400000, particulares: { restaurante: 30000 } }, {});
  assert.equal(r.desglose.consumoDerivado, 400000 - 176030 - 15000 - 30000);
  assert.equal(r.totalFactura, 400000);
  assert.equal(suma(r.totales), 400000);
});

prueba('Sin total: la factura es la suma de los conceptos', () => {
  const r = calcularDesdeFormulario({ total: null, acueducto: 120000, alcantarillado: 80000 }, {});
  assert.equal(r.desglose.modo, 'conceptos');
  assert.equal(r.totalFactura, 200000 + 176030 + 15000);
  assert.equal(suma(r.totales), r.totalFactura);
});

prueba('Total menor que los conceptos fijos: avisa y no rompe', () => {
  const r = calcularDesdeFormulario({ total: 100000 }, {});
  assert.equal(r.desglose.insuficiente, true);
  assert.equal(r.desglose.faltante, 191030 - 100000 + 0);
  assert.equal(r.desglose.consumoDerivado, 0);
  assert.equal(suma(r.totales), r.totalFactura);
});

prueba('Factura en cero no rompe el cálculo', () => {
  const r = calcular({}, {});
  assert.equal(r.totalFactura, 0);
  assert.equal(r.cuadra, true);
});

console.log(`\n${ok} pruebas pasaron`);
