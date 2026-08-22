# Calculadora del recibo de agua

Aplicación estática (HTML + JavaScript, sin dependencias) que reparte el recibo de servicios
públicos entre tres unidades — **residencial**, **odontología** y **restaurante** — aplicando
las reglas del acuerdo de distribución.

## Modos de uso

1. **Sólo el total.** Se ingresa el valor total de la factura y se desglosa con el mismo peso
   que cada concepto tenía en la línea base de Julio 2026. Sobre ese desglose se aplican las
   reglas normales, de modo que los aumentos se asignan según el acuerdo y no sólo en proporción.
2. **Factura detallada.** Se ingresa concepto por concepto: acueducto, alcantarillado, aseo
   residencial, aseo comercial, otros conceptos comunes y otros conceptos particulares.
   Todos los campos son opcionales; los vacíos toman el valor de la línea base.

En ambos modos el resultado muestra cuánto le corresponde a cada parte, el desglose por
concepto y **qué caso del acuerdo se presentó**, con la explicación de por qué se cumplió esa condición.

## Línea base (Julio 2026)

| Concepto | Valor |
|---|---:|
| Acueducto | $84.924 |
| Alcantarillado | $50.181 |
| Aseo residencial | $44.296 |
| Aseo comercial | $131.734 |
| Iluminación | $15.000 |
| **Total** | **$326.135** |

## Casos que reconoce la calculadora

| Código | Concepto | Cuándo se presenta |
|---|---|---|
| A | Acueducto + alcantarillado | El consumo se mantiene dentro del margen de tolerancia: se divide en tercios. |
| A-baja | Acueducto + alcantarillado | El consumo bajó: reparto proporcional, sin mínimo fijo para el restaurante. |
| B | Acueducto + alcantarillado | El consumo aumentó y residencial y odontología mantienen su consumo habitual: el incremento lo asume el restaurante. |
| B-sin-evidencia | Acueducto + alcantarillado | El consumo aumentó pero no se acreditó la condición anterior: el total se divide en tercios. |
| C | Acueducto, alcantarillado y aseo | La tarifa unitaria subió: la línea base se indexa y el mayor valor por tarifa se reparte entre las tres partes. |
| D | Acueducto + alcantarillado | La revisión semestral elevó la participación del restaurante por encima del 33,33%. |
| Aseo A / A2 / A3 | Aseo | Reparto del componente comercial 35% odontología / 65% restaurante. |
| Aseo B | Aseo | Hay evidencia de que el incremento del aseo viene del restaurante: lo asume completo. |
| Aseo R | Aseo | El componente residencial se apartó del histórico; lo asume la unidad residencial. |
| Comunes | Iluminación y comunes | Se dividen en partes iguales. |
| Particulares | Otros conceptos particulares | Multas, intereses o acuerdos de pago los asume quien los generó. |

## Estructura

```
index.html            página única
css/styles.css         estilos (modo claro y oscuro)
js/
  config.js            línea base, valores por defecto y persistencia
  formato.js           formateo y lectura de pesos colombianos
  redondeo.js          reparto en pesos enteros sin descuadres
  proporcional.js      desglose del total según la línea base (modo 1)
  motor.js             orquestación de las reglas
  ui.js                render del resultado
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

Las pruebas reproducen los ejemplos numéricos del acuerdo: $135.105 en tercios, la factura de
$200.000 con incremento al restaurante, el aseo de $176.030 en 44.296 / 46.107 / 85.627 y el
aseo de $220.000 en sus dos variantes.

## Despliegue

Sitio estático desplegado en AWS Amplify Hosting.
