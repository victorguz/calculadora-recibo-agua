/**
 * ui.js
 * Render del resultado: tarjetas por parte, desglose por concepto,
 * escenarios aplicados y comparación con la línea base.
 */

import { pesos, pesosDecimal, porcentaje, numeroDecimal } from './formato.js';
import {
  PARTES,
  LINEA_BASE,
  LINEA_BASE_DETALLE,
  BASE_AA,
  BASE_ASEO,
  BASE_TOTAL,
  FACTURAS,
  REFERENCIA_ASEO,
  ACUERDO_CARGO_FIJO,
} from './config.js';

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
    `Línea base ${LINEA_BASE.periodo} · acueducto + alcantarillado ${pesos(BASE_AA)} · ` +
    `aseo ${pesos(BASE_ASEO)} · iluminación ${pesos(LINEA_BASE.iluminacion)} · total ${pesos(BASE_TOTAL)}`;
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

function avisoInsuficiente(r) {
  const d = r.desglose;
  if (!d || !d.insuficiente) return '';
  return `
    <div class="aviso-descuadre">
      El total digitado no alcanza a cubrir los conceptos fijos (aseo, iluminación y conceptos
      particulares): faltan ${pesos(d.faltante)}. Se calculó con acueducto y alcantarillado en $0.
      Revise el total o ajuste los conceptos.
    </div>`;
}

function bloqueOrigen(r) {
  const d = r.desglose;
  if (!d) return '';

  const f = d.factura;
  const filas = [
    ['Aseo residencial', f.aseoResidencial, 'valor fijo tomado de los conceptos'],
    ['Aseo comercial', f.aseoComercial, 'valor fijo tomado de los conceptos'],
    ['Iluminación', f.iluminacion, 'valor fijo tomado de los conceptos'],
  ];
  if (f.otrosComunes > 0) filas.push(['Otros conceptos comunes', f.otrosComunes, 'valor fijo tomado de los conceptos']);

  const sumaPart = f.particulares.residencial + f.particulares.odontologia + f.particulares.restaurante;
  if (sumaPart > 0) filas.push(['Otros conceptos particulares', sumaPart, 'se descuentan antes de repartir']);

  const nota =
    d.modo === 'total'
      ? 'Acueducto y alcantarillado son el residuo del total: todo lo que la factura tenga por encima de los conceptos fijos se considera consumo.'
      : 'No se digitó un total, así que la factura es la suma de los conceptos ingresados.';

  return `
    <div class="tarjeta">
      <h2>De dónde sale cada concepto</h2>
      <p class="ayuda">${nota}</p>
      <div class="tabla-envoltura">
        <table class="tabla-desglose">
          <thead><tr><th>Concepto</th><th>Origen</th><th>Valor</th></tr></thead>
          <tbody>
            ${filas
              .map(([n, v, origen]) => `<tr><td>${n}</td><td class="nulo">${origen}</td><td>${pesos(v)}</td></tr>`)
              .join('')}
            <tr class="fila-derivada">
              <td>Acueducto + alcantarillado</td>
              <td class="nulo">${d.modo === 'total' ? 'residuo del total' : 'digitado'}</td>
              <td>${pesos(d.consumoDerivado)}</td>
            </tr>
          </tbody>
          <tfoot><tr><th>Total</th><td></td><td>${pesos(r.totalFactura)}</td></tr></tfoot>
        </table>
      </div>
      <p class="ayuda pie-tabla">
        Ese consumo se separa en acueducto ${pesos(f.acueducto)} y alcantarillado ${pesos(f.alcantarillado)}
        con la misma proporción de la línea base, que es la que aplica el ajuste tarifario.
      </p>
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
    return (
      `Residencial ${pesos(b.detalle.residencial)} + comercial ${pesos(b.detalle.comercial)} · ` +
      `cargo fijo ${b.cargoFijo.locales} × ${pesos(b.cargoFijo.unitario)} + consumo ${pesos(b.consumo.actual)}`
    );
  }
  if (b.id === 'comunes') {
    return b.detalle.otros > 0
      ? `Iluminación ${pesos(b.detalle.iluminacion)} + otros comunes ${pesos(b.detalle.otros)}`
      : 'Iluminación · se divide en tercios';
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

/** Desglose del aseo comercial: qué parte es cargo fijo y qué parte consumo. */
function bloqueAseo(r) {
  const b = r.bloques.find((x) => x.id === 'aseo');
  if (!b || b.total <= 0) return '';

  const cf = b.cargoFijo;
  const c = b.consumo;
  const difClase = c.aumento > 0 ? 'sube' : c.aumento < 0 ? 'baja' : 'nulo';
  const difTexto =
    c.aumento === 0
      ? 'igual al histórico'
      : `${c.aumento > 0 ? '+' : '−'}${pesos(Math.abs(c.aumento))} frente al histórico`;

  return `
    <div class="tarjeta">
      <h2>Cómo se parte el aseo comercial</h2>
      <p class="ayuda">
        El cargo fijo no se reparte: cada local comercial paga el suyo. Lo que se reparte
        ${porcentaje(r.config.pctOdontologiaAseo, 0)} / ${porcentaje(r.config.pctRestauranteAseo, 0)}
        es el consumo por toneladas, y todo lo que ese consumo suba sobre el histórico lo asume el restaurante.
      </p>
      <div class="tabla-envoltura">
        <table class="tabla-desglose">
          <thead>
            <tr><th>Parte del cobro</th><th>🦷 Odontología</th><th>🍽️ Restaurante</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Cargo fijo<span class="sub">${cf.locales} local${cf.locales === 1 ? '' : 'es'} × ${pesos(cf.unitario)} · no se reparte</span></th>
              <td>${pesos(cf.odontologia)}</td>
              <td>${pesos(cf.restaurante)}</td>
              <td>${pesos(cf.total)}</td>
            </tr>
            <tr>
              <th scope="row">Consumo por toneladas<span class="sub">histórico ${pesos(c.historico)} (${esc(REFERENCIA_ASEO.periodo).toLowerCase()}) · <span class="${difClase}">${difTexto}</span></span></th>
              <td>${pesos(c.odontologia)}</td>
              <td>${pesos(c.restaurante)}</td>
              <td>${pesos(c.actual)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>Aseo comercial</th>
              <td>${pesos(b.reparto.odontologia)}</td>
              <td>${pesos(b.reparto.restaurante)}</td>
              <td>${pesos(b.detalle.comercial)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="ayuda pie-tabla">
        El componente residencial (${pesos(b.detalle.residencial)}) no entra aquí: lo asume
        íntegramente la unidad residencial, porque es su propio consumo.
      </p>
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
    : '<div class="aviso-descuadre">Atención: la suma de las tres partes no coincide con el total. Revise los valores ingresados.</div>';

  contenedor.innerHTML = [
    avisoInsuficiente(r),
    descuadre,
    bloqueTotal(r),
    tarjetasPartes(r),
    tablaDesglose(r),
    bloqueAseo(r),
    bloqueEscenarios(r),
    bloqueOrigen(r),
    bloqueComparativo(r),
  ].join('');
}

/** Línea corta bajo el campo del total, con el consumo derivado. */
export function renderResumenDerivado(r, elemento) {
  const d = r.desglose;
  if (!d || d.modo !== 'total') {
    elemento.hidden = true;
    return;
  }
  const dif = d.consumoDerivado - r.bloques[0].baseIndexada;
  const clase = dif > 0 ? 'sube' : dif < 0 ? 'baja' : 'nulo';
  const detalle =
    dif === 0
      ? 'igual a la línea base'
      : `${dif > 0 ? '+' : '−'}${pesos(Math.abs(dif))} frente a la línea base`;

  elemento.hidden = false;
  elemento.innerHTML =
    `Consumo derivado de acueducto + alcantarillado: <strong>${pesos(d.consumoDerivado)}</strong> ` +
    `<span class="${clase}">(${detalle})</span>`;
}

/* ------------------------- detalle de línea base ------------------------- */

function tablaConceptos(titulo, total, conceptos, columnas) {
  const filas = conceptos
    .map(
      (c) => `
      <tr>
        <td>${esc(c.nombre)}</td>
        ${columnas ? `<td>${pesosDecimal(c.tarifa)}</td><td>${esc(c.factor)}</td><td>${pesosDecimal(c.precio)}</td><td>${esc(c.cantidad)}</td>` : ''}
        <td>${pesos(c.valor)}</td>
      </tr>`,
    )
    .join('');

  return `
    <h3 class="subtitulo">${esc(titulo)} <span class="opcional">${pesos(total)}</span></h3>
    <div class="tabla-envoltura">
      <table class="tabla-desglose">
        <thead>
          <tr>
            <th>Descripción</th>
            ${columnas ? '<th>Tarifa referencia</th><th>Factor sub/apo</th><th>Precio</th><th>Cantidad</th>' : ''}
            <th>Valor a pagar</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot><tr><th>Total</th>${columnas ? '<td colspan="4"></td>' : ''}<td>${pesos(total)}</td></tr></tfoot>
      </table>
    </div>`;
}

export function renderLineaBase(contenedor) {
  const d = LINEA_BASE_DETALLE;
  const aseoRes = d.aseo.conceptos.filter((c) => c.grupo === 'residencial');
  const aseoCom = d.aseo.conceptos.filter((c) => c.grupo === 'comercial');

  contenedor.innerHTML = `
    <p class="ayuda">
      Factura de ${esc(d.periodo)} de residencial + odontología, antes del inicio del restaurante,
      con un consumo de ${d.consumoM3} m³. Es la referencia del numeral 1 del acuerdo.
    </p>

    <div class="resumen-base">
      <div><span>Acueducto</span><strong>${pesos(LINEA_BASE.acueducto)}</strong></div>
      <div><span>Alcantarillado</span><strong>${pesos(LINEA_BASE.alcantarillado)}</strong></div>
      <div><span>Aseo</span><strong>${pesos(BASE_ASEO)}</strong></div>
      <div><span>Iluminación</span><strong>${pesos(LINEA_BASE.iluminacion)}</strong></div>
      <div class="destacado"><span>Total línea base</span><strong>${pesos(BASE_TOTAL)}</strong></div>
    </div>

    ${tablaConceptos('Servicio de acueducto', d.acueducto.total, d.acueducto.conceptos, true)}
    ${tablaConceptos('Servicio de alcantarillado', d.alcantarillado.total, d.alcantarillado.conceptos, true)}
    ${tablaConceptos('Aseo — componente residencial', d.aseo.residencialFacturado, aseoRes, true)}
    ${tablaConceptos('Aseo — componente comercial', d.aseo.comercialFacturado, aseoCom, true)}
    ${tablaConceptos('Otros conceptos', d.otros.total, d.otros.conceptos, false)}

    <div class="nota-almacen nota-discrepancia">
      <strong>Diferencia por revisar en el reparto del aseo.</strong>
      Sumando los conceptos de la factura, el aseo se separa en
      <strong>${pesos(d.aseo.residencialFacturado)} residencial</strong> y
      <strong>${pesos(d.aseo.comercialFacturado)} comercial</strong> (total ${pesos(d.aseo.total)}).
      El acuerdo escrito usa ${pesos(LINEA_BASE.aseoResidencial)} y ${pesos(LINEA_BASE.aseoComercial)}.
      La calculadora aplica por defecto los valores del acuerdo por ser lo pactado; si las partes
      deciden usar el desglose real de la factura, basta cambiarlos en los conceptos de la factura.
    </div>

    <div class="nota-almacen">
      <strong>Valor unitario de referencia.</strong>
      Acueducto ${numeroDecimal(5275.23)} $/m³ (CMI ${numeroDecimal(3071.7)} + CMO ${numeroDecimal(2130.73)} + impuestos ${numeroDecimal(72.8)}),
      alcantarillado ${numeroDecimal(3048.17)} $/m³ (CMI ${numeroDecimal(2283.32)} + CMO ${numeroDecimal(655.32)} + impuestos ${numeroDecimal(109.53)})
      y aseo ${numeroDecimal(136020.43)} $/tonelada de recolección y transporte.
      Son los valores precargados en el ajuste anual.
    </div>`;
}

/* ----------------------- historial de facturas ----------------------- */

export function renderHistorial(contenedor) {
  const filas = FACTURAS.map((f) => {
    const a = f.aseo;
    return `
      <tr>
        <th scope="row">${esc(f.periodo)}<span class="sub">${esc(f.etiqueta)}</span></th>
        <td>${pesos(a.residencial)}</td>
        <td>${pesos(a.comercial)}</td>
        <td>${a.localesComerciales} × ${pesos(a.cargoFijoUnitario)}</td>
        <td>${pesos(a.consumoComercial)}</td>
        <td>${numeroDecimal(a.toneladasComerciales, 4)}</td>
        <td>${pesos(a.total)}</td>
      </tr>`;
  }).join('');

  const primera = FACTURAS[0].aseo;
  const ultima = FACTURAS[FACTURAS.length - 1].aseo;
  const anterior = FACTURAS[FACTURAS.length - 2].aseo;

  const subeTotal = ultima.total - anterior.total;
  const subeComercial = ultima.comercial - anterior.comercial;
  const subeResidencial = ultima.residencial - anterior.residencial;
  const subeCargoFijo =
    ultima.cargoFijoUnitario * ultima.localesComerciales -
    anterior.cargoFijoUnitario * anterior.localesComerciales;
  const subeConsumo = ultima.consumoComercial - anterior.consumoComercial;

  contenedor.innerHTML = `
    <p class="ayuda">
      Las tres facturas de aseo que se han revisado. Quedan anotadas para sustentar el reparto
      y la revisión semestral del numeral 9.
    </p>

    <div class="tabla-envoltura">
      <table class="tabla-desglose">
        <thead>
          <tr>
            <th>Período</th><th>Residencial</th><th>Comercial</th>
            <th>Cargo fijo</th><th>Consumo</th><th>Ton. com.</th><th>Total aseo</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>

    <h3 class="subtitulo">Qué cambió en la última factura</h3>
    <ul class="lista-cambios">
      <li><strong>Total del aseo:</strong> ${pesos(anterior.total)} → ${pesos(ultima.total)}
        <span class="sube">(+${pesos(subeTotal)}, ${porcentaje((subeTotal / anterior.total) * 100, 1)})</span></li>
      <li><strong>Residencial:</strong> ${pesos(anterior.residencial)} → ${pesos(ultima.residencial)}
        <span class="nulo">(${subeResidencial >= 0 ? '+' : '−'}${pesos(Math.abs(subeResidencial))}, prácticamente igual)</span></li>
      <li><strong>Cargo fijo comercial:</strong> ${anterior.localesComerciales} local a ${pesos(anterior.cargoFijoUnitario)}
        → ${ultima.localesComerciales} locales a ${pesos(ultima.cargoFijoUnitario)}
        <span class="sube">(+${pesos(subeCargoFijo)})</span></li>
      <li><strong>Consumo comercial:</strong> ${pesos(anterior.consumoComercial)} → ${pesos(ultima.consumoComercial)}
        <span class="sube">(+${pesos(subeConsumo)})</span>, con el tonelaje pasando de
        ${numeroDecimal(anterior.toneladasComerciales, 4)} a ${numeroDecimal(ultima.toneladasComerciales, 4)} ton</li>
      <li><strong>Tarifas unitarias:</strong> sin cambio relevante entre los dos meses
        (recolección ${pesosDecimal(anterior.tarifaRecoleccion)} → ${pesosDecimal(ultima.tarifaRecoleccion)}),
        así que no hay ajuste tarifario que reclamar.</li>
    </ul>

    <h3 class="subtitulo">Acuerdo sobre el cargo fijo <span class="opcional">${esc(ACUERDO_CARGO_FIJO.fecha)}</span></h3>
    <div class="nota-almacen nota-acuerdo">
      <strong>Comunicado a la odontología · ${esc(ACUERDO_CARGO_FIJO.fuente)}</strong>
      <p class="cita">${esc(ACUERDO_CARGO_FIJO.texto)}</p>
    </div>
    <ul class="lista-cambios">
      ${ACUERDO_CARGO_FIJO.consecuencias.map((c) => `<li>${esc(c)}</li>`).join('')}
    </ul>

    <div class="nota-almacen">
      <strong>Por qué el aumento es atribuible al restaurante.</strong>
      El residencial lleva tres facturas en el mismo nivel
      (${pesos(primera.residencial)} → ${pesos(anterior.residencial)} → ${pesos(ultima.residencial)})
      y la odontología venía en ${numeroDecimal(anterior.toneladasComerciales, 4)} toneladas.
      Si sostiene ese nivel, el restaurante aporta
      ${numeroDecimal(ultima.toneladasComerciales - anterior.toneladasComerciales, 4)} toneladas, el
      ${porcentaje(((ultima.toneladasComerciales - anterior.toneladasComerciales) / ultima.toneladasComerciales) * 100, 0)}
      del tonelaje comercial. Se cumple la condición del numeral 2 y aplica el numeral 5.
    </div>`;
}

/* ------------------------------------------------------------------ */

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
