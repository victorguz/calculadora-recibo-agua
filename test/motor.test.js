/**
 * Pruebas del motor contra los ejemplos numéricos del acuerdo.
 * Ejecutar con: node test/motor.test.js
 */
import assert from 'node:assert/strict';
import { calcular, calcularDesdeTotal } from '../js/motor.js';
import { LINEA_BASE } from '../js/config.js';

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

prueba('Escenario A: factura igual a la línea base', () => {
  const r = calcular(facturaBase, {});
  const aa = r.bloques.find((b) => b.id === 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'A');
  assert.equal(aa.reparto.residencial, 45035);
  assert.equal(aa.reparto.odontologia, 45035);
  assert.equal(aa.reparto.restaurante, 45035);
});

prueba('Escenario A: aseo 176.030 -> 44.296 / 46.107 / 85.627', () => {
  const r = calcular(facturaBase, {});
  const aseo = r.bloques.find((b) => b.id === 'aseo');
  assert.equal(aseo.reparto.residencial, 44296);
  assert.equal(aseo.reparto.odontologia, 46107);
  assert.equal(aseo.reparto.restaurante, 85627);
});

prueba('Iluminación 15.000 -> 5.000 cada uno', () => {
  const r = calcular(facturaBase, {});
  const c = r.bloques.find((b) => b.id === 'comunes');
  assert.deepEqual(c.reparto, { residencial: 5000, odontologia: 5000, restaurante: 5000 });
});

prueba('Escenario B: acueducto+alcantarillado en 200.000', () => {
  const r = calcular({ ...facturaBase, acueducto: 120000, alcantarillado: 80000 }, {});
  const aa = r.bloques.find((b) => b.id === 'acueducto');
  assert.equal(aa.escenarios.some((e) => e.codigo === 'B'), true);
  assert.equal(aa.reparto.residencial, 45035);
  assert.equal(aa.reparto.odontologia, 45035);
  assert.equal(aa.reparto.restaurante, 109930);
  assert.equal(aa.reparto.residencial + aa.reparto.odontologia + aa.reparto.restaurante, 200000);
});

prueba('Escenario B sin evidencia: se divide entre tres', () => {
  const r = calcular({ ...facturaBase, acueducto: 120000, alcantarillado: 80000 }, {
    consumoHabitualDemostrado: false,
  });
  const aa = r.bloques.find((b) => b.id === 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'B-sin-evidencia');
  assert.equal(aa.reparto.restaurante, 66666);
  assert.equal(aa.reparto.residencial + aa.reparto.odontologia + aa.reparto.restaurante, 200000);
});

prueba('Aseo 220.000 con reparto inicial 35/65', () => {
  const r = calcular({ ...facturaBase, aseoComercial: 220000 - 44296 }, {});
  const aseo = r.bloques.find((b) => b.id === 'aseo');
  assert.equal(aseo.reparto.residencial, 44296);
  assert.equal(aseo.reparto.odontologia, 61496);
  assert.equal(aseo.reparto.restaurante, 114208);
  assert.equal(aseo.total, 220000);
});

prueba('Aseo 220.000 con incremento atribuido al restaurante', () => {
  const r = calcular({ ...facturaBase, aseoComercial: 220000 - 44296 }, {
    incrementoAseoAlRestaurante: true,
  });
  const aseo = r.bloques.find((b) => b.id === 'aseo');
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-B'), true);
  assert.equal(aseo.reparto.odontologia, 46107);
  assert.equal(aseo.reparto.restaurante, 85627 + 43970);
  assert.equal(aseo.total, 220000);
});

prueba('Consumo por debajo de la línea base: partes iguales', () => {
  const r = calcular({ ...facturaBase, acueducto: 60000, alcantarillado: 30000 }, {});
  const aa = r.bloques.find((b) => b.id === 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'A-baja');
  assert.equal(aa.reparto.restaurante, 30000);
});

prueba('Ajuste progresivo al 50%', () => {
  const r = calcular(facturaBase, { pctRestauranteAA: 50 });
  const aa = r.bloques.find((b) => b.id === 'acueducto');
  assert.equal(aa.escenarios.some((e) => e.codigo === 'D'), true);
  assert.equal(aa.reparto.restaurante, 67553);
  assert.equal(aa.reparto.residencial + aa.reparto.odontologia + aa.reparto.restaurante, 135105);
});

prueba('Gastos particulares van a quien los generó', () => {
  const r = calcular({ ...facturaBase, particulares: { odontologia: 50000 } }, {});
  const p = r.bloques.find((b) => b.id === 'particulares');
  assert.equal(p.reparto.odontologia, 50000);
  assert.equal(p.reparto.residencial, 0);
  assert.equal(r.totales.odontologia, 45035 + 46107 + 5000 + 50000);
});

prueba('Ajuste tarifario (escenario C) no castiga al restaurante', () => {
  const r = calcular({ ...facturaBase, acueducto: 92000, alcantarillado: 54000 }, {
    tarifas: { acueducto: { base: 100, actual: 108 }, alcantarillado: { base: 100, actual: 108 } },
  });
  const aa = r.bloques.find((b) => b.id === 'acueducto');
  assert.equal(aa.escenarios.some((e) => e.codigo === 'C'), true);
  assert.equal(aa.baseIndexada, Math.round(135105 * 1.08));
  // 146.000 vs base indexada 145.913 -> dentro de tolerancia, partes iguales
  assert.equal(aa.escenarios.some((e) => e.codigo === 'A'), true);
});

prueba('Modo total: 326.135 reproduce la línea base', () => {
  const r = calcularDesdeTotal(326135, {});
  assert.equal(r.desglose.factura.acueducto, 84924);
  assert.equal(r.desglose.factura.alcantarillado, 50181);
  assert.equal(r.desglose.factura.aseoResidencial, 44296);
  assert.equal(r.desglose.factura.aseoComercial, 131734);
  assert.equal(r.desglose.factura.iluminacion, 15000);
});

prueba('Modo total: 300.000 cuadra exacto', () => {
  const r = calcularDesdeTotal(300000, {});
  assert.equal(r.totalFactura, 300000);
  assert.equal(r.cuadra, true);
  const suma = r.totales.residencial + r.totales.odontologia + r.totales.restaurante;
  assert.equal(suma, 300000);
});

prueba('Modo total: 500.000 cuadra exacto y sube el restaurante', () => {
  const r = calcularDesdeTotal(500000, {});
  assert.equal(r.cuadra, true);
  assert.equal(r.totales.residencial + r.totales.odontologia + r.totales.restaurante, 500000);
  assert.ok(r.totales.restaurante > r.totales.residencial);
});

prueba('Modo total con gastos particulares descontados antes de prorratear', () => {
  const r = calcularDesdeTotal(400000, {}, { restaurante: 100000 });
  assert.equal(r.desglose.distribuible, 300000);
  assert.equal(r.totalFactura, 400000);
  assert.equal(r.totales.residencial + r.totales.odontologia + r.totales.restaurante, 400000);
});

prueba('Factura en cero no rompe el cálculo', () => {
  const r = calcular({}, {});
  assert.equal(r.totalFactura, 0);
  assert.equal(r.cuadra, true);
});

console.log(`\n${ok} pruebas pasaron`);
