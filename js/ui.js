/**
 * ui.js
 * Render del resultado: tarjetas por parte, desglose por concepto,
 * escenarios aplicados y comparación con la línea base.
 */

import { pesos, porcentaje } from './formato.js';
import { PARTES, LINEA_BASE, BASE_TOTAL } from './config.js';

const ORDEN = PARTES.map((p) => p.id);

function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** "Aseo-B" -> "Aseo B" · "B-sin-evidencia" -> "B" */
function marcaEscenario(codigo) {
  if (codigo.startsWith('Aseo-')) return codigo.replace('Aseo-', 'Aseo ');
  if (codigo.includes('-')) return codigo.split('-')[0];
  return codigo;
}

export function pintarChipLineaBase(elemento) {
  elemento.textContent =
    `Línea base ${LINEA_BASE.periodo} · acueducto + alcantarillado ${pesos(135105)} · ` +
    `aseo ${pesos(176030)} · iluminación ${pesos(15000)} · total ${pesos(BASE_TOTAL)}`;
}

/* ------------------------------------------------------------------ */

function bloqueTotal(r) {
  const dif = r.totalFactura - BASE_TOTAL;
  const clase = dif > 0 ? 'sube' : dif < 0 ? 'baja' : 'nulo';
  const texto =
    dif === 0
      ? 'igual a la línea base'
      : `${dif > 0 ? '+' : '−'}${pesos(Math.abs(dif))} frente a la línea base`;
  return `
    <div class="resultado-total">
      <span class="etiqueta">Total de la factura</span>
      <span class="cifra">${pesos(r.totalFactura)}</span>
      <span class="nota">Línea base ${pesos(BASE_TOTAL)} · <span class="${clase}">${texto}</span></span>
    </div>`;
}

function bloqueDesgloseEstimado(r) {
  if (!r.desglose) return '';
  const d = r.desglose;
  const p = d.participaciones;
  const filas = [
    ['Acueducto', d.factura.acueducto, p.acueducto],
    ['Alcantarillado', d.factura.alcantarillado, p.alcantarillado],
    ['Aseo residencial', d.factura.aseoResidencial, p.aseoResidencial],
    ['Aseo comercial', d.factura.aseoComercial, p.aseoComercial],
    ['Iluminación', d.factura.iluminacion, p.iluminacion],
  ]
    .map(
      ([nombre, valor, pct]) => `
        <tr><td>${nombre}</td><td>${porcentaje(pct)}</td><td>${pesos(valor)}</td></tr>`,
    )
    .join('');

  const propios = d.valoresPropios > 0
    ? `<tr><td>Gastos exclusivos de una unidad</td><td class="nulo">—</td><td>${pesos(d.valoresPropios)}</td></tr>`
    : '';

  return `
    <div class="tarjeta">
      <h2>Desglose estimado del total</h2>
      <p class="ayuda">Cada concepto recibe el mismo porcentaje que representaba en la línea base de ${LINEA_BASE.periodo}. Sobre este desglose se aplican después las reglas del acuerdo.</p>
      <div class="tabla-envoltura">
        <table class="tabla-desglose">
          <thead><tr><th>Concepto</th><th>Peso en la línea base</th><th>Valor estimado</th></tr></thead>
          <tbody>${filas}${propios}</tbody>
          <tfoot><tr><th>Total</th><td></td><td>${pesos(d.totalFactura)}</td></tr></tfoot>
        </table>
      </div>
    </div>`;
}

function tarjetasPartes(r) {
  const tarjetas = PARTES.map((parte) => {
    const valor = r.totales[parte.id];
    const pct = r.porcentajes[parte.id];
    const items = r.bloques
      .filter((b) => b.total > 0 || b.reparto[parte.id] > 0)
      .map((b) => {
        const v = b.reparto[parte.id];
        return `<li><span>${esc(b.concepto)}</span><span class="v ${v === 0 ? 'cero' : ''}">${pesos(v)}</span></li>`;
      })
      .join('');

    return `
      <article class="parte" data-parte="${parte.id}">
        <div class="parte-nombre"><span aria-hidden="true">${parte.icono}</span> ${parte.nombre}</div>
        <div class="parte-valor">${pesos(valor)}</div>
        <div class="parte-pct">${porcentaje(pct)} de la factura</div>
        <div class="parte-barra"><span style="width:${Math.max(0, Math.min(100, pct)).toFixed(2)}%"></span></div>
        <ul class="parte-lista">${items || '<li><span>Sin conceptos</span><span class="v cero">$0</span></li>'}</ul>
      </article>`;
  }).join('');

  return `<div class="partes">${tarjetas}</div>`;
}

function subtituloBloque(b) {
  if (b.id === 'acueducto') {
    return `Acueducto ${pesos(b.detalle.acueducto)} + alcantarillado ${pesos(b.detalle.alcantarillado)} · línea base ${pesos(b.baseIndexada)}`;
  }
  if (b.id === 'aseo') {
    return `Residencial ${pesos(b.detalle.residencial)} + comercial ${pesos(b.detalle.comercial)} · histórico comercial ${pesos(b.baseIndexada)}`;
  }
  if (b.id === 'comunes') {
    return b.detalle.otros > 0
      ? `Iluminación ${pesos(b.detalle.iluminacion)} + otros comunes ${pesos(b.detalle.otros)}`
      : `Iluminación · se divide en tercios`;
  }
  return 'Cada unidad asume lo que generó';
}

function tablaDesglose(r) {
  const filas = r.bloques
    .filter((b) => b.total > 0)
    .map(
      (b) => `
        <tr>
          <th scope="row">${esc(b.concepto)}<span class="sub">${subtituloBloque(b)}</span></th>
          ${ORDEN.map((id) => `<td>${pesos(b.reparto[id])}</td>`).join('')}
          <td>${pesos(b.total)}</td>
        </tr>`,
    )
    .join('');

  return `
    <div class="tarjeta">
      <h2>Cómo quedó distribuida la factura</h2>
      <p class="ayuda">Valores en pesos enteros. La suma de las tres partes coincide exactamente con el total facturado.</p>
      <div class="tabla-envoltura">
        <table class="tabla-desglose">
          <thead>
            <tr>
              <th>Concepto</th>
              ${PARTES.map((p) => `<th>${p.icono} ${p.nombre}</th>`).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${filas || '<tr><td colspan="5" class="nulo">Sin valores para distribuir.</td></tr>'}</tbody>
          <tfoot>
            <tr>
              <th>Total a pagar</th>
              ${ORDEN.map((id) => `<td>${pesos(r.totales[id])}</td>`).join('')}
              <td>${pesos(r.totalFactura)}</td>
            </tr>
            <tr>
              <th>Participación</th>
              ${ORDEN.map((id) => `<td>${porcentaje(r.porcentajes[id])}</td>`).join('')}
              <td>100,00 %</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

function bloqueEscenarios(r) {
  const items = r.escenarios
    .map(
      (e) => `
        <div class="escenario" data-tono="${e.tono}">
          <span class="escenario-marca">${esc(marcaEscenario(e.codigo))}</span>
          <span class="escenario-meta">${esc(e.concepto)} · ${esc(e.numeral)}</span>
          <span class="escenario-titulo">${esc(e.titulo)}</span>
          <span class="escenario-texto">${esc(e.descripcion)}</span>
        </div>`,
    )
    .join('');

  return `
    <div class="tarjeta">
      <h2>Casos que se presentan en este período</h2>
      <p class="ayuda">Cada tarjeta indica qué regla del acuerdo se activó y por qué se cumple esa condición.</p>
      <div class="escenarios">${items || '<p class="ayuda">Sin conceptos que evaluar.</p>'}</div>
    </div>`;
}

function celdaVariacion(valor) {
  if (valor === 0) return '<td class="nulo">sin cambio</td>';
  const clase = valor > 0 ? 'sube' : 'baja';
  const signo = valor > 0 ? '+' : '−';
  return `<td class="${clase}">${signo}${pesos(Math.abs(valor))}</td>`;
}

function bloqueComparativo(r) {
  const c = r.comparativo;
  const filas = PARTES.map(
    (p) => `
      <tr>
        <th scope="row">${p.icono} ${p.nombre}</th>
        <td>${p.id === 'restaurante' ? '<span class="nulo">no existía</span>' : pesos(c.antes[p.id])}</td>
        <td>${pesos(c.ahora[p.id])}</td>
        ${p.id === 'restaurante' ? `<td class="sube">+${pesos(c.ahora[p.id])}</td>` : celdaVariacion(c.variacion[p.id])}
      </tr>`,
  ).join('');

  return `
    <div class="tarjeta">
      <h2>Comparación con la situación anterior</h2>
      <p class="ayuda">Antes del restaurante, acueducto, alcantarillado e iluminación se dividían entre dos, el aseo residencial lo pagaba residencial y el comercial odontología. La comparación usa la línea base de ${LINEA_BASE.periodo}.</p>
      <div class="tabla-envoltura">
        <table class="comparativo">
          <thead><tr><th>Parte</th><th>Antes (línea base)</th><th>Este período</th><th>Variación</th></tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr><th>Total factura</th><td>${pesos(c.totalLineaBase)}</td><td>${pesos(r.totalFactura)}</td>${celdaVariacion(c.variacionFactura)}</tr></tfoot>
        </table>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */

export function renderResultado(r, contenedor) {
  const descuadre = r.cuadra
    ? ''
    : `<div class="aviso-descuadre">Atención: la suma de las tres partes no coincide con el total. Revise los valores ingresados.</div>`;

  contenedor.innerHTML = [
    descuadre,
    bloqueTotal(r),
    tarjetasPartes(r),
    bloqueDesgloseEstimado(r),
    tablaDesglose(r),
    bloqueEscenarios(r),
    bloqueComparativo(r),
  ].join('');
}

/** Texto plano para el botón "Copiar resumen". */
export function resumenTexto(r) {
  const lineas = [];
  lineas.push('DISTRIBUCIÓN DEL RECIBO DE AGUA');
  lineas.push(`Total de la factura: ${pesos(r.totalFactura)}`);
  lineas.push(`Línea base ${LINEA_BASE.periodo}: ${pesos(BASE_TOTAL)}`);
  lineas.push('');

  for (const p of PARTES) {
    lineas.push(`${p.icono} ${p.nombre}: ${pesos(r.totales[p.id])}  (${porcentaje(r.porcentajes[p.id])})`);
  }
  lineas.push('');
  lineas.push('DESGLOSE POR CONCEPTO');
  for (const b of r.bloques.filter((x) => x.total > 0)) {
    lineas.push(
      `${b.concepto} — total ${pesos(b.total)}: ` +
        PARTES.map((p) => `${p.nombre} ${pesos(b.reparto[p.id])}`).join(' · '),
    );
  }
  lineas.push('');
  lineas.push('CASOS APLICADOS');
  for (const e of r.escenarios) {
    lineas.push(`[${marcaEscenario(e.codigo)}] ${e.concepto} — ${e.titulo} (${e.numeral})`);
    lineas.push(`    ${e.descripcion}`);
  }
  return lineas.join('\n');
}
