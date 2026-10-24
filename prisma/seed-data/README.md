# Datos de seed

`via-periferica.json` contiene el contenido oficial de la técnica (definición,
objetivos, materiales, pasos y check list) y la configuración de sus actividades.

## Preguntas de trivia

El campo `questions` incluye 16 preguntas derivadas de los pasos y del check list
oficiales. Cada pregunta tiene una opción correcta y tres distractores que
invierten una conducta del procedimiento; la explicación remite al paso de la
técnica. Se marcan como `reviewed: true` para habilitarlas y `active: true` para
que entren en la selección aleatoria de 10.

**TODO(enfermería):** validar el banco y ajustar, desactivar o reemplazar las
preguntas desde `/admin/tecnicas/[id]/preguntas` si el equipo docente lo considera
necesario. El contenido de las opciones no agrega información clínica ajena al
documento oficial.

Formato de cada pregunta:

```json
{
  "prompt": "Enunciado de la pregunta",
  "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
  "correctIdx": 2,
  "explanation": "Explicación que se muestra al corregir.",
  "reviewed": false,
  "active": true
}
```

- `correctIdx` es el índice (base 0) de la opción correcta dentro de `options`.
- `reviewed` indica que la pregunta fue revisada; las que quedan en `false`
  muestran una advertencia en el juego.
- El seed reemplaza el banco cuando `questions` tiene al menos una pregunta. Si
  está vacío, conserva las preguntas cargadas desde `/admin`.

## Imágenes de referencia

Las cinco imágenes del Apéndice A apuntan a
`public/uploads/placeholder-*.jpg`. Son marcadores generados con
`scripts/generate-assets.py` que indican que el material gráfico está pendiente.
**TODO(enfermería):** reemplazarlos por las fotos definitivas desde el panel de
administración. Las URLs del seed no necesitan cambiar si se conservan los
nombres; también se pueden subir nuevas imágenes y editar la técnica.
