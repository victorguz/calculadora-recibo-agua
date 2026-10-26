/**
 * Pruebas del motor contra los ejemplos numéricos del acuerdo.
 * Ejecutar con: node test/motor.test.js
 */
import assert from 'node:assert/strict';
import { calcular, calcularDesdeFormulario } from '../js/motor.js';
import {
  LINEA_BASE,
  BASE_TOTAL,
  BASE_AA,
  FACTURAS,
  REFERENCIA_ASEO,
  VALORES_SUGERIDOS,
} from '../js/config.js';

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

const OCT = FACTURAS[2].aseo;
const ANT = FACTURAS[1].aseo;
const facturaAseoOct = { aseoResidencial: OCT.residencial, aseoComercial: OCT.comercial };

prueba('Las facturas documentadas cuadran consigo mismas', () => {
  for (const f of FACTURAS) {
    const a = f.aseo;
    assert.equal(a.residencial + a.comercial, a.total, `total de ${f.periodo}`);
    assert.equal(
      a.cargoFijoUnitario * a.localesComerciales + a.consumoComercial,
      a.comercial,
      `comercial de ${f.periodo}`,
    );
  }
});

prueba('Octubre: cada local su cuota fija y todo el consumo repartido 35/65', () => {
  const aseo = bloque(calcular(facturaAseoOct, {}), 'aseo');
  assert.equal(aseo.total, 326892);
  assert.equal(aseo.cargoFijo.locales, 2);
  assert.equal(aseo.cargoFijo.odontologia, 71028);
  assert.equal(aseo.cargoFijo.restaurante, 71028);
  assert.equal(aseo.consumo.actual, 136178);
  assert.equal(aseo.consumo.odontologia, 47662);
  assert.equal(aseo.consumo.restaurante, 88516);
  assert.deepEqual(aseo.reparto, { residencial: 48658, odontologia: 118690, restaurante: 159544 });
  assert.equal(suma(aseo.reparto), 326892);
});

prueba('El aumento del consumo no se cuenta dos veces', () => {
  const aseo = bloque(calcular(facturaAseoOct, {}), 'aseo');
  const pesoRest = (aseo.consumo.restaurante / aseo.consumo.actual) * 100;
  // El restaurante asume el 65% del consumo, no más.
  assert.ok(Math.abs(pesoRest - 65) < 0.1, `el restaurante asume ${pesoRest.toFixed(1)}% del consumo`);
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-A2'), true);
});

prueba('La regla extra del numeral 5 sigue disponible, pero apagada', () => {
  const conRegla = bloque(calcular(facturaAseoOct, { incrementoAseoAlRestaurante: true }), 'aseo');
  assert.equal(conRegla.consumo.odontologia, 19228);
  assert.equal(conRegla.consumo.restaurante, 35710 + 81240);
  assert.deepEqual(conRegla.reparto, { residencial: 48658, odontologia: 90256, restaurante: 187978 });
  assert.equal(conRegla.escenarios.some((e) => e.codigo === 'Aseo-B'), true);
  // Por defecto NO se aplica.
  const porDefecto = bloque(calcular(facturaAseoOct, {}), 'aseo');
  assert.equal(porDefecto.escenarios.some((e) => e.codigo === 'Aseo-B'), false);
});

prueba('El cargo fijo no se reparte 35/65', () => {
  const aseo = bloque(calcular(facturaAseoOct, {}), 'aseo');
  // Si se repartiera 35/65, la odontología pagaría 49.720 de cargo fijo, no 71.028.
  assert.notEqual(aseo.cargoFijo.odontologia, Math.round(aseo.cargoFijo.total * 0.35));
  assert.equal(aseo.cargoFijo.odontologia, aseo.cargoFijo.restaurante);
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-CF'), true);
});

prueba('Mes anterior: un solo local, el cargo fijo lo asume la odontología', () => {
  const aseo = bloque(
    calcular(
      { aseoResidencial: ANT.residencial, aseoComercial: ANT.comercial },
      { localesComerciales: 1, cargoFijoComercial: ANT.cargoFijoUnitario },
    ),
    'aseo',
  );
  assert.equal(aseo.total, 174373);
  assert.equal(aseo.cargoFijo.odontologia, 70854);
  assert.equal(aseo.cargoFijo.restaurante, 0);
  assert.equal(aseo.consumo.aumento, 0);
  assert.equal(suma(aseo.reparto), 174373);
});

prueba('Sin evidencia, el aumento del consumo se reparte 35/65', () => {
  const aseo = bloque(calcular(facturaAseoOct, { incrementoAseoAlRestaurante: false }), 'aseo');
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-A2'), true);
  assert.equal(aseo.consumo.odontologia, Math.round(136178 * 0.35));
  assert.equal(suma(aseo.reparto), 326892);
});

prueba('Si el consumo vuelve al histórico, nadie asume aumento', () => {
  const comercial = 71028 * 2 + REFERENCIA_ASEO.consumoComercial;
  const aseo = bloque(calcular({ aseoResidencial: 48658, aseoComercial: comercial }, {}), 'aseo');
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-A'), true);
  assert.equal(aseo.consumo.odontologia, 19228);
  assert.equal(aseo.consumo.restaurante, 35710);
  assert.equal(suma(aseo.reparto), comercial + 48658);
});

prueba('Cargo fijo mal configurado no rompe ni descuadra', () => {
  const aseo = bloque(
    calcular({ aseoResidencial: 48658, aseoComercial: 50000 }, { localesComerciales: 2 }),
    'aseo',
  );
  assert.equal(aseo.escenarios.some((e) => e.codigo === 'Aseo-CF-aviso'), true);
  assert.equal(aseo.consumo.actual, 0);
  assert.equal(suma(aseo.reparto), 50000 + 48658);
});

/* ------------------------------ otros conceptos ------------------------------ */

prueba('Iluminación 15.000 -> 5.000 cada uno', () => {
  const c = bloque(calcular(facturaBase, {}), 'comunes');
  assert.deepEqual(c.reparto, { residencial: 5000, odontologia: 5000, restaurante: 5000 });
});

prueba('Gastos particulares van a quien los generó', () => {
  const r = calcular(
    { ...facturaBase, ...facturaAseoOct, particulares: { odontologia: 50000 } },
    {},
  );
  const p = bloque(r, 'particulares');
  assert.equal(p.reparto.odontologia, 50000);
  assert.equal(p.reparto.residencial, 0);
  assert.equal(r.totales.odontologia, 45035 + 118690 + 5000 + 50000);
});

/* --------------------------- formulario unificado --------------------------- */

// Conceptos que el formulario sugiere por defecto: aseo de octubre + iluminación.
const FIJOS =
  VALORES_SUGERIDOS.aseoResidencial + VALORES_SUGERIDOS.aseoComercial + VALORES_SUGERIDOS.iluminacion;
// Una factura típica de octubre si el acueducto se mantuviera en la línea base.
const TOTAL_TIPICO = FIJOS + BASE_AA;

prueba('Los valores sugeridos son los de la factura más reciente', () => {
  assert.equal(VALORES_SUGERIDOS.aseoResidencial, FACTURAS[2].aseo.residencial);
  assert.equal(VALORES_SUGERIDOS.aseoComercial, FACTURAS[2].aseo.comercial);
  assert.equal(FIJOS, 341892);
});

prueba('Sólo el total: el residuo es el consumo de acueducto', () => {
  const r = calcularDesdeFormulario({ total: TOTAL_TIPICO }, {});
  assert.equal(r.desglose.modo, 'total');
  assert.equal(r.desglose.consumoDerivado, BASE_AA);
  assert.equal(r.desglose.factura.aseoComercial, VALORES_SUGERIDOS.aseoComercial);
  assert.equal(bloque(r, 'acueducto').escenarios[0].codigo, 'A');
  assert.equal(suma(r.totales), TOTAL_TIPICO);
});

prueba('Sólo el total: el aumento cae en consumo de agua, no en aseo', () => {
  const r = calcularDesdeFormulario({ total: TOTAL_TIPICO + 50000 }, {});
  assert.equal(r.desglose.consumoDerivado, BASE_AA + 50000);
  assert.equal(bloque(r, 'aseo').total, 326892);
  const aa = bloque(r, 'acueducto');
  assert.equal(aa.reparto.residencial, 45035);
  assert.equal(aa.reparto.restaurante, 45035 + 50000);
  assert.equal(suma(r.totales), TOTAL_TIPICO + 50000);
});

prueba('Sólo el total: si el agua baja, los tres pagan menos', () => {
  const r = calcularDesdeFormulario({ total: 450000 }, {});
  assert.equal(r.cuadra, true);
  assert.equal(r.desglose.consumoDerivado, 450000 - FIJOS);
  const aa = bloque(r, 'acueducto');
  assert.equal(aa.escenarios[0].codigo, 'A-baja');
  assert.equal(aa.reparto.restaurante, 36036);
  assert.equal(suma(r.totales), 450000);
});

prueba('Total con aseo comercial ajustado a mano', () => {
  const r = calcularDesdeFormulario({ total: TOTAL_TIPICO, aseoComercial: 200000 }, {});
  assert.equal(bloque(r, 'aseo').total, VALORES_SUGERIDOS.aseoResidencial + 200000);
  assert.equal(
    r.desglose.consumoDerivado,
    TOTAL_TIPICO - VALORES_SUGERIDOS.aseoResidencial - 200000 - VALORES_SUGERIDOS.iluminacion,
  );
  assert.equal(suma(r.totales), TOTAL_TIPICO);
});

prueba('Total con gastos particulares: se descuentan antes de derivar el consumo', () => {
  const r = calcularDesdeFormulario(
    { total: TOTAL_TIPICO + 30000, particulares: { restaurante: 30000 } },
    {},
  );
  assert.equal(r.desglose.consumoDerivado, BASE_AA);
  assert.equal(r.totalFactura, TOTAL_TIPICO + 30000);
  assert.equal(suma(r.totales), TOTAL_TIPICO + 30000);
});

prueba('Sin total: la factura es la suma de los conceptos', () => {
  const r = calcularDesdeFormulario({ total: null }, {});
  assert.equal(r.desglose.modo, 'conceptos');
  assert.equal(r.totalFactura, TOTAL_TIPICO);
  assert.equal(suma(r.totales), r.totalFactura);
});

prueba('Total menor que los conceptos fijos: avisa y no rompe', () => {
  const r = calcularDesdeFormulario({ total: 200000 }, {});
  assert.equal(r.desglose.insuficiente, true);
  assert.equal(r.desglose.faltante, FIJOS - 200000);
  assert.equal(r.desglose.consumoDerivado, 0);
  assert.equal(suma(r.totales), r.totalFactura);
});
prueba('Factura en cero no rompe el cálculo', () => {
  const r = calcular({}, {});
  assert.equal(r.totalFactura, 0);
  assert.equal(r.cuadra, true);
});

console.log(`\n${ok} pruebas pasaron`);
