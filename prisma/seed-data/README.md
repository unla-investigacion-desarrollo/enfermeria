# Datos de seed

`via-periferica.json` contiene el Apéndice A (contenido de la técnica) y la
configuración de sus actividades.

## Preguntas de trivia (Apéndice B)

El campo `questions` está vacío a la espera del banco de preguntas del Apéndice B.

**TODO(enfermería):** cargar las preguntas revisadas por el equipo de Enfermería.
No inventar ni reformular contenido clínico.

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
- `reviewed` queda en `false` hasta que Enfermería apruebe la pregunta.
- El seed solo reemplaza el banco si `questions` tiene al menos una pregunta. Si
  está vacío, conserva las preguntas cargadas desde `/admin`.
