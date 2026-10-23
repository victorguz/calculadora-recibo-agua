# Calculadora del recibo de agua

Aplicación estática (HTML + JavaScript, sin dependencias) que reparte el recibo de servicios
públicos entre tres unidades — **residencial**, **odontología** y **restaurante** — aplicando
las reglas del acuerdo de distribución.

## Cómo funciona

Un solo formulario. Basta con digitar el **total de la factura**: el aseo y la iluminación
prácticamente no cambian mes a mes, así que traen el valor de la línea base, y **la diferencia
se atribuye al consumo de acueducto y alcantarillado**, que es lo que realmente varía. Ese
incremento lo asume el restaurante.

Si algún concepto llegó distinto, se despliega **Conceptos de la factura** y se ajusta. Todos los
campos son opcionales y traen por defecto el valor de la línea base de Julio 2026:

- Aseo residencial y aseo comercial
- Iluminación y otros conceptos comunes
- Acueducto y alcantarillado (se calculan como el residuo del total; para digitarlos a mano, se
  deja vacío el total y la factura pasa a ser la suma de los conceptos)
- Otros conceptos particulares por unidad — multas, intereses de mora, acuerdos de pago

**No hay margen de tolerancia:** cualquier peso por encima de la línea base es incremento y lo
asume el restaurante, siempre que residencial y odontología mantengan su consumo habitual.

## Cambio de octubre de 2026: el cargo fijo del aseo

Triple A se dio cuenta de que en el predio hay **dos locales comerciales** y empezó a cobrar una
tarifa fija mensual por cada uno ($71.028). Por eso el cargo fijo ya **no se divide 35/65**: cada
local paga el que le corresponde. Lo que se sigue repartiendo 35% / 65% es el consumo por
toneladas, y todo el aumento de ese consumo sobre el histórico lo asume el restaurante.

| Período | Residencial | Comercial | Cargo fijo | Consumo | Ton. comerciales | Total |
|---|---:|---:|---:|---:|---:|---:|
| Julio 2026 *(línea base)* | $49.020 | $127.010 | 1 × $72.408 | $54.602 | 0,1202 | $176.030 |
| Mes anterior | $48.581 | $125.792 | 1 × $70.854 | $54.938 | 0,1180 | $174.373 |
| Octubre 2026 | $48.658 | $278.234 | 2 × $71.028 | $136.178 | 0,3032 | $326.892 |

Las tarifas unitarias **no se movieron** entre los dos últimos meses, así que no hay ajuste
tarifario que reclamar. El residencial lleva tres facturas igual (+0,16%) y la odontología venía
en 0,1180 toneladas; si sostiene ese nivel, el restaurante aporta el 61% del tonelaje comercial.

Con la factura de octubre el aseo comercial queda así:

| | Cargo fijo | Consumo | **Total** |
|---|---:|---:|---:|
| 🦷 Odontología | $71.028 | $19.228 | **$90.256** |
| 🍽️ Restaurante | $71.028 | $116.950 | **$187.978** |

Las tres facturas y el texto del acuerdo están en `js/config.js` (`FACTURAS` y
`ACUERDO_CARGO_FIJO`) y se consultan en la app bajo *Facturas del período y acuerdo del cargo fijo*.

## Línea base (Julio 2026)

| Concepto | Valor |
|---|---:|
| Acueducto | $84.924 |
| Alcantarillado | $50.181 |
| Aseo residencial | $44.296 |
| Aseo comercial | $131.734 |
| Iluminación | $15.000 |
| **Total** | **$326.135** |

El desglose completo de esa factura — concepto por concepto, con tarifa de referencia, factor de
subsidio/aporte, precio y cantidad — está anotado en `js/config.js` (`LINEA_BASE_DETALLE`) y se
puede consultar en la app bajo *Detalle de la línea base*. El consumo de ese período fue de 16 m³.

> **Diferencia pendiente de definir.** Sumando los conceptos de la factura, el aseo se separa en
> **$49.020 residencial** y **$127.010 comercial**. El acuerdo escrito usa $44.296 y $131.734.
> La calculadora aplica por defecto los valores del acuerdo por ser lo pactado; para usar el
> desglose real basta cambiarlos en los conceptos de la factura.

### Valor unitario de referencia

Precargado en el ajuste anual (escenario C):

| Concepto | Valor unitario en la línea base |
|---|---:|
| Acueducto | $5.275,23 /m³ (CMI 3.071,70 + CMO 2.130,73 + impuestos 72,80) |
| Alcantarillado | $3.048,17 /m³ (CMI 2.283,32 + CMO 655,32 + impuestos 109,53) |
| Aseo | $136.020,43 /tonelada de recolección y transporte |

## Casos que reconoce la calculadora

| Código | Concepto | Cuándo se presenta |
|---|---|---:|
| A | Acueducto + alcantarillado | El consumo coincide con la línea base: se divide en tercios. |
| A-baja | Acueducto + alcantarillado | El consumo bajó: reparto en tercios, sin mínimo fijo para el restaurante. |
| B | Acueducto + alcantarillado | El consumo aumentó y residencial y odontología mantienen su consumo habitual: todo el incremento lo asume el restaurante. |
| B-sin-evidencia | Acueducto + alcantarillado | El consumo aumentó pero no se acreditó la condición anterior: el total se divide en tercios. |
| C | Acueducto, alcantarillado y aseo | La tarifa unitaria subió: la línea base se indexa y el mayor valor por tarifa se reparte entre las tres partes. |
| D | Acueducto + alcantarillado | La revisión semestral elevó la participación del restaurante por encima del 33,33%. |
| Aseo CF / CF1 | Aseo | Cada local comercial paga su propio cargo fijo (CF1: la factura sólo cobra uno). |
| Aseo A / A2 / A3 | Aseo | Reparto del consumo comercial 35% odontología / 65% restaurante. |
| Aseo B | Aseo | El consumo de aseo aumentó y el aumento lo asume completo el restaurante. |
| Aseo R | Aseo | El componente residencial se apartó más de $1.000 de su referencia; lo asume la unidad residencial. |
| Comunes | Iluminación y comunes | Se dividen en partes iguales. |
| Particulares | Otros conceptos particulares | Multas, intereses o acuerdos de pago los asume quien los generó. |

## Dónde se guarda la configuración

El botón **Guardar configuración** la almacena en el `localStorage` del navegador: queda en ese
equipo y en ese navegador, no se sube a ningún servidor ni la ven las otras partes.

Para que las tres unidades trabajen con los mismos parámetros está **Copiar enlace con estos
datos**: codifica los valores del formulario y de la configuración en la URL, de modo que quien
la abra vea exactamente el mismo cálculo.

## Estructura

```
index.html            página única
css/styles.css         estilos (modo claro y oscuro)
js/
  config.js            línea base, detalle de la factura, defaults y persistencia
  formato.js           formateo y lectura de pesos colombianos
  redondeo.js          reparto en pesos enteros sin descuadres
  desglose.js          arma la factura desde el total o desde los conceptos
  enlace.js            comparte datos y configuración por URL
  motor.js             orquestación de las reglas
  ui.js                render del resultado y del detalle de la línea base
  main.js              arranque y eventos
  reglas/
    acueducto.js       numerales 2 y 3
    aseo.js            numerales 4 y 5
    comunes.js         numerales 6 y 7
    particulares.js    numeral 8
test/motor.test.js     pruebas contra los ejemplos numéricos del acuerdo
```

## Ejecutar en local

Los módulos son ES modules, así que se necesita un servidor HTTP (abrir el archivo con doble
clic no funciona):

```bash
python -m http.server 4173
```

Y abrir <http://localhost:4173>.

## Pruebas

```bash
node test/motor.test.js
```

Reproducen los ejemplos numéricos del acuerdo: $135.105 en tercios, la factura de $200.000 con
incremento al restaurante, el aseo de $176.030 en 44.296 / 46.107 / 85.627, el aseo de $220.000 en
sus dos variantes, y el comportamiento del formulario unificado (el aumento del total cae en
consumo y no en aseo).

## Despliegue

Sitio estático en AWS Amplify Hosting (región us-east-2). Cada push a `main` redespliega solo.
