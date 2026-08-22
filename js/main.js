/**
 * main.js
 * Arranque de la aplicación: lee el formulario, invoca el motor y pinta el resultado.
 */

import { LINEA_BASE, BASE_TOTAL, CONFIG_DEFAULT, cargarConfig, guardarConfig, borrarConfig } from './config.js';
import { leerNumero, leerNumeroODefecto } from './formato.js';
import { calcular, calcularDesdeTotal } from './motor.js';
import { renderResultado, resumenTexto, pintarChipLineaBase } from './ui.js';

const $ = (id) => document.getElementById(id);

const el = {
  chipLineaBase: $('chipLineaBase'),
  tabTotal: $('tabTotal'),
  tabDetalle: $('tabDetalle'),
  panelTotal: $('panelTotal'),
  panelDetalle: $('panelDetalle'),

  totalFactura: $('totalFactura'),
  tPartResidencial: $('tPartResidencial'),
  tPartOdontologia: $('tPartOdontologia'),
  tPartRestaurante: $('tPartRestaurante'),

  acueducto: $('acueducto'),
  alcantarillado: $('alcantarillado'),
  aseoResidencial: $('aseoResidencial'),
  aseoComercial: $('aseoComercial'),
  iluminacion: $('iluminacion'),
  otrosComunes: $('otrosComunes'),
  dPartResidencial: $('dPartResidencial'),
  dPartOdontologia: $('dPartOdontologia'),
  dPartRestaurante: $('dPartRestaurante'),

  consumoHabitualDemostrado: $('consumoHabitualDemostrado'),
  incrementoAseoAlRestaurante: $('incrementoAseoAlRestaurante'),
  toleranciaPct: $('toleranciaPct'),
  pctRestauranteAA: $('pctRestauranteAA'),
  pctOdontologiaAseo: $('pctOdontologiaAseo'),
  tarAcuBase: $('tarAcuBase'),
  tarAcuActual: $('tarAcuActual'),
  tarAlcBase: $('tarAlcBase'),
  tarAlcActual: $('tarAlcActual'),
  tarAseoBase: $('tarAseoBase'),
  tarAseoActual: $('tarAseoActual'),

  btnCalcular: $('btnCalcular'),
  btnCopiar: $('btnCopiar'),
  btnImprimir: $('btnImprimir'),
  btnGuardarConfig: $('btnGuardarConfig'),
  btnRestablecer: $('btnRestablecer'),
  avisoGuardado: $('avisoGuardado'),
  avisoCopia: $('avisoCopia'),
  resultados: $('resultados'),
};

let modo = 'total';
let ultimoResultado = null;

/* ------------------------- lectura del formulario ------------------------- */

function leerConfig() {
  const pctOdo = leerNumeroODefecto(el.pctOdontologiaAseo.value, CONFIG_DEFAULT.pctOdontologiaAseo);
  return {
    toleranciaPct: leerNumeroODefecto(el.toleranciaPct.value, CONFIG_DEFAULT.toleranciaPct),
    pctRestauranteAA: leerNumeroODefecto(el.pctRestauranteAA.value, CONFIG_DEFAULT.pctRestauranteAA),
    pctOdontologiaAseo: pctOdo,
    pctRestauranteAseo: Math.max(0, 100 - pctOdo),
    consumoHabitualDemostrado: el.consumoHabitualDemostrado.checked,
    incrementoAseoAlRestaurante: el.incrementoAseoAlRestaurante.checked,
    tarifas: {
      acueducto: {
        base: leerNumeroODefecto(el.tarAcuBase.value, 0),
        actual: leerNumeroODefecto(el.tarAcuActual.value, 0),
      },
      alcantarillado: {
        base: leerNumeroODefecto(el.tarAlcBase.value, 0),
        actual: leerNumeroODefecto(el.tarAlcActual.value, 0),
      },
      aseo: {
        base: leerNumeroODefecto(el.tarAseoBase.value, 0),
        actual: leerNumeroODefecto(el.tarAseoActual.value, 0),
      },
    },
  };
}

function leerFacturaDetallada() {
  return {
    acueducto: leerNumeroODefecto(el.acueducto.value, LINEA_BASE.acueducto),
    alcantarillado: leerNumeroODefecto(el.alcantarillado.value, LINEA_BASE.alcantarillado),
    aseoResidencial: leerNumeroODefecto(el.aseoResidencial.value, LINEA_BASE.aseoResidencial),
    aseoComercial: leerNumeroODefecto(el.aseoComercial.value, LINEA_BASE.aseoComercial),
    iluminacion: leerNumeroODefecto(el.iluminacion.value, LINEA_BASE.iluminacion),
    otrosComunes: leerNumeroODefecto(el.otrosComunes.value, 0),
    particulares: {
      residencial: leerNumeroODefecto(el.dPartResidencial.value, 0),
      odontologia: leerNumeroODefecto(el.dPartOdontologia.value, 0),
      restaurante: leerNumeroODefecto(el.dPartRestaurante.value, 0),
    },
  };
}

function leerParticularesTotal() {
  return {
    residencial: leerNumeroODefecto(el.tPartResidencial.value, 0),
    odontologia: leerNumeroODefecto(el.tPartOdontologia.value, 0),
    restaurante: leerNumeroODefecto(el.tPartRestaurante.value, 0),
  };
}

/* ------------------------------- cálculo ------------------------------- */

function calcularYPintar() {
  const config = leerConfig();

  if (modo === 'total') {
    const total = leerNumeroODefecto(el.totalFactura.value, BASE_TOTAL);
    ultimoResultado = calcularDesdeTotal(total, config, leerParticularesTotal());
  } else {
    ultimoResultado = calcular(leerFacturaDetallada(), config);
  }

  renderResultado(ultimoResultado, el.resultados);
}

/* ------------------------------ pestañas ------------------------------ */

function cambiarModo(nuevo) {
  modo = nuevo;
  const esTotal = nuevo === 'total';

  el.tabTotal.classList.toggle('activa', esTotal);
  el.tabDetalle.classList.toggle('activa', !esTotal);
  el.tabTotal.setAttribute('aria-selected', String(esTotal));
  el.tabDetalle.setAttribute('aria-selected', String(!esTotal));
  el.panelTotal.classList.toggle('oculto', !esTotal);
  el.panelDetalle.classList.toggle('oculto', esTotal);

  calcularYPintar();
}

/* ---------------------------- configuración ---------------------------- */

function pintarConfig(config) {
  el.toleranciaPct.value = config.toleranciaPct ?? '';
  el.pctRestauranteAA.value =
    config.pctRestauranteAA === CONFIG_DEFAULT.pctRestauranteAA
      ? ''
      : String(config.pctRestauranteAA).replace('.', ',');
  el.pctOdontologiaAseo.value = config.pctOdontologiaAseo ?? '';
  el.consumoHabitualDemostrado.checked = Boolean(config.consumoHabitualDemostrado);
  el.incrementoAseoAlRestaurante.checked = Boolean(config.incrementoAseoAlRestaurante);

  const t = config.tarifas || {};
  el.tarAcuBase.value = t.acueducto?.base || '';
  el.tarAcuActual.value = t.acueducto?.actual || '';
  el.tarAlcBase.value = t.alcantarillado?.base || '';
  el.tarAlcActual.value = t.alcantarillado?.actual || '';
  el.tarAseoBase.value = t.aseo?.base || '';
  el.tarAseoActual.value = t.aseo?.actual || '';
}

function avisar(elemento, texto) {
  elemento.textContent = texto;
  setTimeout(() => {
    elemento.textContent = '';
  }, 2600);
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
  el.tabTotal.addEventListener('click', () => cambiarModo('total'));
  el.tabDetalle.addEventListener('click', () => cambiarModo('detalle'));

  el.btnCalcular.addEventListener('click', calcularYPintar);

  const recalcular = conRetardo(calcularYPintar);
  document.querySelectorAll('input[type="text"]').forEach((input) => {
    input.addEventListener('input', recalcular);
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
    avisar(el.avisoGuardado, guardado ? 'Configuración guardada' : 'No se pudo guardar');
  });

  el.btnRestablecer.addEventListener('click', () => {
    borrarConfig();
    pintarConfig(CONFIG_DEFAULT);
    calcularYPintar();
    avisar(el.avisoGuardado, 'Valores por defecto restaurados');
  });

  el.btnCopiar.addEventListener('click', async () => {
    if (!ultimoResultado) calcularYPintar();
    const texto = resumenTexto(ultimoResultado);
    try {
      await navigator.clipboard.writeText(texto);
      avisar(el.avisoCopia, 'Resumen copiado');
    } catch {
      // Respaldo para navegadores sin permiso de portapapeles.
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        avisar(el.avisoCopia, 'Resumen copiado');
      } catch {
        avisar(el.avisoCopia, 'No se pudo copiar');
      }
      area.remove();
    }
  });

  el.btnImprimir.addEventListener('click', () => window.print());
}

/* -------------------------------- inicio -------------------------------- */

function iniciar() {
  pintarChipLineaBase(el.chipLineaBase);
  pintarConfig(cargarConfig());
  enlazarEventos();
  cambiarModo('total');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

// Expuesto para depuración manual desde la consola del navegador.
window.calculadoraRecibo = { calcular, calcularDesdeTotal, leerNumero };
