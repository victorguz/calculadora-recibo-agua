/**
 * main.js
 * Arranque de la aplicación: lee el formulario, invoca el motor y pinta el resultado.
 */

import {
  LINEA_BASE,
  CONFIG_DEFAULT,
  cargarConfig,
  guardarConfig,
  borrarConfig,
} from './config.js';
import { leerNumero, leerNumeroODefecto } from './formato.js';
import { calcular, calcularDesdeFormulario } from './motor.js';
import {
  renderResultado,
  renderResumenDerivado,
  renderLineaBase,
  resumenTexto,
  pintarChipLineaBase,
} from './ui.js';
import { construirUrl, leerDesdeUrl } from './enlace.js';

const $ = (id) => document.getElementById(id);

const el = {
  chipLineaBase: $('chipLineaBase'),
  totalFactura: $('totalFactura'),
  resumenDerivado: $('resumenDerivado'),
  bloqueConceptos: $('bloqueConceptos'),
  ayudaConsumo: $('ayudaConsumo'),

  acueducto: $('acueducto'),
  alcantarillado: $('alcantarillado'),
  aseoResidencial: $('aseoResidencial'),
  aseoComercial: $('aseoComercial'),
  iluminacion: $('iluminacion'),
  otrosComunes: $('otrosComunes'),
  partResidencial: $('partResidencial'),
  partOdontologia: $('partOdontologia'),
  partRestaurante: $('partRestaurante'),

  consumoHabitualDemostrado: $('consumoHabitualDemostrado'),
  incrementoAseoAlRestaurante: $('incrementoAseoAlRestaurante'),
  pctRestauranteAA: $('pctRestauranteAA'),
  pctOdontologiaAseo: $('pctOdontologiaAseo'),
  tarAcuBase: $('tarAcuBase'),
  tarAcuActual: $('tarAcuActual'),
  tarAlcBase: $('tarAlcBase'),
  tarAlcActual: $('tarAlcActual'),
  tarAseoBase: $('tarAseoBase'),
  tarAseoActual: $('tarAseoActual'),

  btnCalcular: $('btnCalcular'),
  btnEnlace: $('btnEnlace'),
  btnCopiar: $('btnCopiar'),
  btnImprimir: $('btnImprimir'),
  btnGuardarConfig: $('btnGuardarConfig'),
  btnRestablecer: $('btnRestablecer'),
  avisoGuardado: $('avisoGuardado'),
  avisoCopia: $('avisoCopia'),
  resultados: $('resultados'),
  detalleLineaBase: $('detalleLineaBase'),
};

let ultimoResultado = null;

/* ------------------------- lectura del formulario ------------------------- */

/** ¿El usuario digitó un total? Si sí, acueducto y alcantarillado son el residuo. */
function hayTotal() {
  return leerNumero(el.totalFactura.value) !== null;
}

function leerConfig() {
  const pctOdo = leerNumeroODefecto(el.pctOdontologiaAseo.value, CONFIG_DEFAULT.pctOdontologiaAseo);
  return {
    pctRestauranteAA: leerNumeroODefecto(el.pctRestauranteAA.value, CONFIG_DEFAULT.pctRestauranteAA),
    pctOdontologiaAseo: pctOdo,
    pctRestauranteAseo: Math.max(0, 100 - pctOdo),
    consumoHabitualDemostrado: el.consumoHabitualDemostrado.checked,
    incrementoAseoAlRestaurante: el.incrementoAseoAlRestaurante.checked,
    tarifas: {
      acueducto: {
        base: leerNumeroODefecto(el.tarAcuBase.value, CONFIG_DEFAULT.tarifas.acueducto.base),
        actual: leerNumeroODefecto(el.tarAcuActual.value, 0),
      },
      alcantarillado: {
        base: leerNumeroODefecto(el.tarAlcBase.value, CONFIG_DEFAULT.tarifas.alcantarillado.base),
        actual: leerNumeroODefecto(el.tarAlcActual.value, 0),
      },
      aseo: {
        base: leerNumeroODefecto(el.tarAseoBase.value, CONFIG_DEFAULT.tarifas.aseo.base),
        actual: leerNumeroODefecto(el.tarAseoActual.value, 0),
      },
    },
  };
}

function leerEntrada() {
  return {
    total: hayTotal() ? leerNumero(el.totalFactura.value) : null,
    acueducto: leerNumeroODefecto(el.acueducto.value, LINEA_BASE.acueducto),
    alcantarillado: leerNumeroODefecto(el.alcantarillado.value, LINEA_BASE.alcantarillado),
    aseoResidencial: leerNumeroODefecto(el.aseoResidencial.value, LINEA_BASE.aseoResidencial),
    aseoComercial: leerNumeroODefecto(el.aseoComercial.value, LINEA_BASE.aseoComercial),
    iluminacion: leerNumeroODefecto(el.iluminacion.value, LINEA_BASE.iluminacion),
    otrosComunes: leerNumeroODefecto(el.otrosComunes.value, 0),
    particulares: {
      residencial: leerNumeroODefecto(el.partResidencial.value, 0),
      odontologia: leerNumeroODefecto(el.partOdontologia.value, 0),
      restaurante: leerNumeroODefecto(el.partRestaurante.value, 0),
    },
  };
}

/* ------------------------------- cálculo ------------------------------- */

/**
 * Cuando hay total, acueducto y alcantarillado se derivan: se muestran como
 * resultado y no se pueden editar, para que no haya dos fuentes de verdad.
 */
function sincronizarCamposConsumo(resultado) {
  const derivado = hayTotal();
  const f = resultado.desglose.factura;

  for (const campo of [el.acueducto, el.alcantarillado]) {
    campo.readOnly = derivado;
    campo.classList.toggle('derivado', derivado);
  }

  if (derivado) {
    el.acueducto.value = f.acueducto.toLocaleString('es-CO');
    el.alcantarillado.value = f.alcantarillado.toLocaleString('es-CO');
    el.ayudaConsumo.textContent =
      'Se calculan como el residuo del total: lo que la factura tenga por encima de los conceptos fijos es consumo. Para digitarlos a mano, deje vacío el total de la factura.';
  } else {
    el.ayudaConsumo.textContent =
      'Sin total en la factura, estos valores mandan: el total pasa a ser la suma de todos los conceptos.';
  }
}

function calcularYPintar() {
  const config = leerConfig();
  ultimoResultado = calcularDesdeFormulario(leerEntrada(), config);

  sincronizarCamposConsumo(ultimoResultado);
  renderResumenDerivado(ultimoResultado, el.resumenDerivado);
  renderResultado(ultimoResultado, el.resultados);
}

/* ---------------------------- configuración ---------------------------- */

function pintarConfig(config) {
  el.pctRestauranteAA.value =
    config.pctRestauranteAA === CONFIG_DEFAULT.pctRestauranteAA
      ? ''
      : String(config.pctRestauranteAA).replace('.', ',');
  el.pctOdontologiaAseo.value = config.pctOdontologiaAseo ?? '';
  el.consumoHabitualDemostrado.checked = Boolean(config.consumoHabitualDemostrado);
  el.incrementoAseoAlRestaurante.checked = Boolean(config.incrementoAseoAlRestaurante);

  const t = config.tarifas || {};
  const mostrar = (valor) => (valor ? String(valor).replace('.', ',') : '');
  el.tarAcuBase.value = mostrar(t.acueducto?.base);
  el.tarAcuActual.value = mostrar(t.acueducto?.actual);
  el.tarAlcBase.value = mostrar(t.alcantarillado?.base);
  el.tarAlcActual.value = mostrar(t.alcantarillado?.actual);
  el.tarAseoBase.value = mostrar(t.aseo?.base);
  el.tarAseoActual.value = mostrar(t.aseo?.actual);
}

/** Aplica los valores que vengan en la URL compartida. */
function aplicarUrl(datos) {
  const asignar = (campo, elemento) => {
    if (datos[campo] !== undefined) elemento.value = datos[campo];
  };
  asignar('total', el.totalFactura);
  asignar('acueducto', el.acueducto);
  asignar('alcantarillado', el.alcantarillado);
  asignar('aseoResidencial', el.aseoResidencial);
  asignar('aseoComercial', el.aseoComercial);
  asignar('iluminacion', el.iluminacion);
  asignar('otrosComunes', el.otrosComunes);
  asignar('partResidencial', el.partResidencial);
  asignar('partOdontologia', el.partOdontologia);
  asignar('partRestaurante', el.partRestaurante);
  asignar('pctRestauranteAA', el.pctRestauranteAA);
  asignar('pctOdontologiaAseo', el.pctOdontologiaAseo);
  asignar('tarAcuBase', el.tarAcuBase);
  asignar('tarAcuActual', el.tarAcuActual);
  asignar('tarAlcBase', el.tarAlcBase);
  asignar('tarAlcActual', el.tarAlcActual);
  asignar('tarAseoBase', el.tarAseoBase);
  asignar('tarAseoActual', el.tarAseoActual);

  if (datos.consumoHabitualDemostrado !== undefined) {
    el.consumoHabitualDemostrado.checked = datos.consumoHabitualDemostrado;
  }
  if (datos.incrementoAseoAlRestaurante !== undefined) {
    el.incrementoAseoAlRestaurante.checked = datos.incrementoAseoAlRestaurante;
  }
}

function datosParaEnlace() {
  return {
    total: el.totalFactura.value,
    acueducto: hayTotal() ? '' : el.acueducto.value,
    alcantarillado: hayTotal() ? '' : el.alcantarillado.value,
    aseoResidencial: el.aseoResidencial.value,
    aseoComercial: el.aseoComercial.value,
    iluminacion: el.iluminacion.value,
    otrosComunes: el.otrosComunes.value,
    partResidencial: el.partResidencial.value,
    partOdontologia: el.partOdontologia.value,
    partRestaurante: el.partRestaurante.value,
    pctRestauranteAA: el.pctRestauranteAA.value,
    pctOdontologiaAseo: el.pctOdontologiaAseo.value,
    consumoHabitualDemostrado: el.consumoHabitualDemostrado.checked,
    incrementoAseoAlRestaurante: el.incrementoAseoAlRestaurante.checked,
    tarAcuBase: el.tarAcuBase.value,
    tarAcuActual: el.tarAcuActual.value,
    tarAlcBase: el.tarAlcBase.value,
    tarAlcActual: el.tarAlcActual.value,
    tarAseoBase: el.tarAseoBase.value,
    tarAseoActual: el.tarAseoActual.value,
  };
}

function avisar(elemento, texto) {
  elemento.textContent = texto;
  setTimeout(() => {
    elemento.textContent = '';
  }, 3000);
}

async function copiar(texto, aviso, mensajeOk) {
  try {
    await navigator.clipboard.writeText(texto);
    avisar(aviso, mensajeOk);
    return;
  } catch {
    /* respaldo abajo */
  }
  const area = document.createElement('textarea');
  area.value = texto;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand('copy');
    avisar(aviso, mensajeOk);
  } catch {
    avisar(aviso, 'No se pudo copiar');
  }
  area.remove();
}

/* ------------------------------- eventos ------------------------------- */

function conRetardo(fn, ms = 220) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

function enlazarEventos() {
  el.btnCalcular.addEventListener('click', calcularYPintar);

  const recalcular = conRetardo(calcularYPintar);
  document.querySelectorAll('input[type="text"]').forEach((input) => {
    input.addEventListener('input', (ev) => {
      if (ev.target.readOnly) return;
      recalcular();
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        calcularYPintar();
      }
    });
  });
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', calcularYPintar);
  });

  el.btnGuardarConfig.addEventListener('click', () => {
    const guardado = guardarConfig(leerConfig());
    avisar(
      el.avisoGuardado,
      guardado ? 'Guardada en este navegador' : 'No se pudo guardar en este navegador',
    );
  });

  el.btnRestablecer.addEventListener('click', () => {
    borrarConfig();
    pintarConfig(CONFIG_DEFAULT);
    calcularYPintar();
    avisar(el.avisoGuardado, 'Valores por defecto restaurados');
  });

  el.btnEnlace.addEventListener('click', () => {
    const url = construirUrl(datosParaEnlace());
    history.replaceState(null, '', url);
    copiar(url, el.avisoCopia, 'Enlace copiado');
  });

  el.btnCopiar.addEventListener('click', () => {
    if (!ultimoResultado) calcularYPintar();
    copiar(resumenTexto(ultimoResultado), el.avisoCopia, 'Resumen copiado');
  });

  el.btnImprimir.addEventListener('click', () => window.print());
}

/* -------------------------------- inicio -------------------------------- */

function iniciar() {
  pintarChipLineaBase(el.chipLineaBase);
  renderLineaBase(el.detalleLineaBase);
  pintarConfig(cargarConfig());

  const datosUrl = leerDesdeUrl();
  if (Object.keys(datosUrl).length > 0) {
    aplicarUrl(datosUrl);
    // Si vienen conceptos distintos a los de la línea base, ábralos a la vista.
    el.bloqueConceptos.open = true;
  }

  enlazarEventos();
  calcularYPintar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

// Expuesto para depuración manual desde la consola del navegador.
window.calculadoraRecibo = { calcular, calcularDesdeFormulario, leerNumero };
