# PLAN.md — Manual Digital de Técnicas de Enfermería (MVP)

Proyecto interdisciplinario UNLa (Sistemas + Enfermería + Diseño + Educación).
Objetivo del MVP: virtualizar el cuadernillo **"Colocación de vía periférica en
adulto"** con lectura, videos de apoyo, dos juegos interactivos y un perfil
gamificado.

> Resumen operativo del plan original. El contenido clínico completo (Apéndice A) y
> el banco de preguntas (Apéndice B) se cargan en `prisma/seed-data/` en la Fase 4 y
> 8 respectivamente, sin inventar ni modificar texto.

## 0. Reglas de trabajo

- [x] Ejecutar una fase por vez, en orden, sin avanzar hasta cumplir la aceptación.
- [x] Al cerrar cada fase: `npm run lint`, `npm run typecheck`, `npm test` y commit
      `feat(fase-N): <resumen>`.
- [x] Mantener este archivo actualizado con las tareas completadas.
- [x] No inventar contenido clínico: usar Apéndices A y B. Si falta algo, dejar
      `TODO(enfermería)`.
- [x] Decisiones no cubiertas: la opción más simple, registrada en `DECISIONS.md`.
- [x] Interfaz en español rioplatense (vos), mobile-first.

## 1. Alcance

**Incluido:** admin (login; alta/listado/desactivación/reseteo de estudiantes;
contenido estructurado de técnicas; publicar/despublicar; banco de trivia) y
estudiante (login con cambio obligatorio de contraseña; inicio; lectura por
secciones con progreso; videos; marcar lectura terminada y releer; Ordenar los
pasos; Trivia; perfil con XP, nivel, insignias e historial). Seed con la técnica
completa.

**Fuera del MVP (modelo preparado, sin implementar):** sala de escape, "Armar la
bandeja", "Encontrá el error", rol docente, lista de cotejo evaluada, rankings,
rachas, notificaciones, carga CSV, recuperación por email.

## 2. Stack

Next.js 15 (App Router) + TypeScript estricto · Tailwind + shadcn/ui ·
`@dnd-kit` · PostgreSQL 16 + Prisma · Auth.js v5 Credentials + bcryptjs ·
Zod · `/public/uploads` detrás de `StorageService` · Vitest + Playwright ·
Manifest PWA.

Variables de entorno (`.env.example`):

```env
DATABASE_URL=postgresql://manual:manual@localhost:5432/manual
AUTH_SECRET=cambiar
SEED_ADMIN_EMAIL=admin@unla.edu.ar
SEED_ADMIN_PASSWORD=cambiar-en-primer-login
```

## 3. Roles y permisos

| Acción | ADMIN | STUDENT |
| --- | --- | --- |
| Gestionar estudiantes | ✅ | ❌ |
| Crear/editar/publicar técnicas y preguntas | ✅ | ❌ |
| Ver técnicas publicadas | ✅ | ✅ |
| Jugar y sumar progreso | ❌ (vista previa sin guardar) | ✅ |
| Ver su perfil | — | ✅ (solo el propio) |

- `/admin/**` solo ADMIN; rutas de estudiante requieren sesión (`middleware.ts`).
- `mustChangePassword = true` redirige a `/cambiar-password`.
- Toda server action valida rol y propiedad del recurso en el servidor.

## 4. Modelo de datos

Ver [`prisma/schema.prisma`](./prisma/schema.prisma). Entidades: `User`,
`Technique`, `Objective`, `Material`, `Step`, `TechniqueImage`, `Video`,
`ChecklistItem`, `Activity`, `TriviaQuestion`, `ReadingCompletion`, `VideoView`,
`ActivityAttempt`, `XpEvent`, `Badge`, `UserBadge`.

El XP total no se persiste: `SUM(XpEvent.amount)`. `XpEvent` tiene
`@@unique([userId, refKey])` para idempotencia.

## 5. Gamificación

| Evento | XP | refKey |
| --- | --- | --- |
| Primera lectura terminada | 100 | `READING_FIRST:<techniqueId>` |
| Primera lectura de nueva versión | 30 | `READING_VERSION:<techniqueId>:<version>` |
| Ver un video (primera vez) | 20 | `VIDEO:<videoId>` |
| Aprobar Ordenar los pasos | 150 | `PASS:<activityId>` |
| Aprobar Trivia | 100 | `PASS:<activityId>` |
| 100% en una actividad | 50 | `PERFECT:<activityId>` |
| Técnica dominada | 200 | `MASTERED:<techniqueId>` |

Relecturas y reintentos se registran pero no suman XP. Lógica en
`lib/gamification/{award,levels,badges}.ts`.

**Niveles:** 1 Ingresante (0), 2 Practicante (150), 3 Asistente (400),
4 Avanzado/a (800), 5 Referente (1500). Barra: "te faltan N XP para el nivel X".

**Insignias:** `FIRST_READING`, `REVIEWER` (3 lecturas de la misma técnica),
`ORDERED_MIND` (100% ordenar), `TRIVIA_STAR` (100% trivia), `MASTER_<slug>`.

## 6. Juegos

**Ordenar los pasos:** bloque aleatorio de `blockSize` (8) pasos consecutivos,
nunca en orden correcto. Drag & drop + botones ↑ ↓ accesibles. Puntaje =
`LIS(ordenPropuesto) / n * 100` redondeado. Aprobado con `>= passScore` (80).
Se guarda bloque y orden propuesto en `detail`.

**Trivia:** `questionCount` (10) preguntas activas al azar, opciones mezcladas,
una por pantalla, corrección en server action (la respuesta correcta nunca viaja
al cliente antes de responder). Puntaje = aciertos/total*100. Aprobado con >= 70.
Aviso al admin si hay `reviewed = false`.

**Escape room:** enum presente, UI "Próximamente".

## 7. Pantallas

**Estudiante:** login; cambio de contraseña obligatorio (mín. 8, distinta de la
provisoria); inicio con header bordó (#8A1E3C), banda azul (#1B3558), buscador,
tarjeta con progreso, accesos a fotos/video/juego, bloque Evaluación, nav inferior
(Inicio · Técnicas · Perfil) y pie institucional; lectura por secciones con
progreso de scroll y "Terminé la lectura"; juegos con resultado y "Reintentar";
perfil con nivel, XP, insignias e historial.

**Admin:** estudiantes (tabla, búsqueda, alta con contraseña provisoria
generable, desactivar/reactivar, resetear); técnicas (listado con estado y
versión, editor por secciones con listas ordenables, subida de imágenes con alt y
crédito, vista previa, publicar); preguntas (CRUD + "Revisada por docente").

## 8. Seguridad

bcrypt cost 12; nunca loguear contraseñas; rate limit de login (5/15 min por
email+IP, en memoria); Zod en todas las entradas; DNI 7-8 dígitos, solo admin,
nunca en URLs/logs; email único en minúsculas; subida solo JPEG/PNG/WebP <= 5 MB
con nombre generado; videos solo YouTube embebidos con `youtube-nocookie.com`;
CSP y headers básicos.

## 9. Fases

### Fase 1 — Base del proyecto

- [x] Next.js 15 + TypeScript estricto + Tailwind + shadcn/ui (base) + ESLint + Prettier.
- [x] `docker-compose.yml` con PostgreSQL 16 y `.env.example`.
- [x] Prisma con el schema de la sección 4 y primera migración.
- [x] Scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `db:reset`.
- [x] `README.md` con puesta en marcha desde cero.
- [x] Aceptación: `docker compose up -d && npm run db:migrate && npm run dev` levanta sin errores; lint y typecheck pasan.

### Fase 2 — Autenticación y roles

- [x] Auth.js Credentials con bcrypt; sesión con role y mustChangePassword.
- [x] `middleware.ts` con las reglas de la sección 3.
- [x] Pantallas de login y cambio de contraseña.
- [x] Seed del admin desde variables de entorno.
- [x] Rate limit de login.
- [x] Aceptación: admin obligado a cambiar contraseña; estudiante no abre `/admin/**`; e2e de login y cambio.

### Fase 3 — Admin: estudiantes

- [x] Listado, alta, desactivar/reactivar, reseteo de contraseña.
- [x] Un estudiante desactivado no puede iniciar sesión.
- [x] Aceptación: e2e alta → ingreso con provisoria → cambio → inicio; duplicados con error claro.

### Fase 4 — Contenido: técnicas

- [x] `prisma/seed-data/via-periferica.json` (Apéndice A) y seed publicado con actividades e insignias.
- [x] Listado y editor admin con listas ordenables y vista previa.
- [x] Subida de imágenes vía `StorageService`.
- [x] Versionado al editar contenido publicado.
- [x] Aceptación: seed completo (29 pasos, 6 materiales, 15 ítems); editar/reordenar/publicar sube versión.

### Fase 5 — Estudiante: inicio y lectura

- [x] Inicio según sección 7 (buscador y progreso).
- [x] Lectura por secciones, imágenes con crédito, videos embebidos.
- [x] "Terminé la lectura" crea `ReadingCompletion` (también relecturas).
- [x] Registro de `VideoView` al reproducir.
- [x] Aceptación: e2e doble lectura → 2 registros y 100 XP (no 200).

### Fase 6 — Gamificación

- [x] `lib/gamification`: `awardXp`, `getLevel`, `evaluateBadges` con tests.
- [x] Integrar XP e insignias en lectura y videos.
- [x] Pantalla de perfil.
- [x] Toast de XP/insignia.
- [x] Aceptación: tests de niveles e idempotencia; perfil correcto.

### Fase 7 — Juego: Ordenar los pasos

- [x] Funciones puras de 6.1 con tests (mezcla nunca identidad; LIS conocido).
- [x] UI dnd-kit + botones ↑ ↓; pantalla de resultado.
- [x] Guardar intento, otorgar XP/insignias.
- [x] Aceptación: completable solo con teclado; aprobar dos veces da XP una vez; 100% otorga `ORDERED_MIND`.

### Fase 8 — Juego: Trivia

- [x] Seed preparado para las preguntas del Apéndice B (`questions: []` con
      `TODO(enfermería)`; `reviewed = false` por defecto).
- [x] CRUD de preguntas en admin.
- [x] Juego con corrección en servidor y explicación por pregunta.
- [x] Guardar intento, XP, insignias y `MASTERED`.
- [x] Aceptación: la respuesta correcta no llega antes de responder; lectura + ordenar + trivia otorga insignia y +200 XP.

### Fase 9 — Pulido y entrega

- [ ] Accesibilidad (contraste, foco, alt, teclado).
- [ ] Manifest PWA e íconos.
- [ ] Estados vacíos y de error.
- [ ] e2e del recorrido completo.
- [ ] README final con capturas y usuario demo.
- [ ] Aceptación: tests OK; Lighthouse mobile >= 90 en Accesibilidad y Buenas prácticas.

## 10. Pendientes para validar con el equipo

- Enfermería: revisar y aprobar las preguntas del Apéndice B (`reviewed`).
- Enfermería: confirmar bloque de 8 pasos vs. técnica completa.
- Diseño: paleta, tipografía, logo e ilustraciones definitivas.
- Educación: umbrales (80% / 70%) y valores de XP.
- Derechos de imagen: reemplazar la ilustración de Pinterest por material propio o licenciado.
- Videos institucionales propios para reemplazar los de YouTube.
