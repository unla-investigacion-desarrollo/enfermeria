# Decisiones de implementación

Registro de decisiones no cubiertas explícitamente por PLAN.md. Se elige la opción
más simple y se anota acá.

## Fase 1

1. **Puerto de PostgreSQL configurable.** El `docker-compose.yml` publica
   `${DB_PORT:-5432}:5432` para poder convivir con otro PostgreSQL local. En esta
   máquina el 5432 estaba ocupado, así que el `.env` local usa `DB_PORT=5433` y
   `DATABASE_URL` apunta a `localhost:5433`. El `.env.example` conserva 5432.
2. **Prisma config file.** Se usa `prisma.config.ts` (con `dotenv/config`) en lugar
   de la clave `prisma` de `package.json`, que está deprecada en Prisma 6.19.
3. **Tailwind CSS v3.4** en lugar de v4: es la versión estable con la que está
   documentado shadcn/ui y evita fricción en el resto de las fases.
4. **ESLint 8 + `.eslintrc.json`.** Se ejecuta `eslint .` directamente en vez de
   `next lint` (deprecado en Next 15.5). Reglas de Prettier integradas.
5. **Tipografía Montserrat por Google Fonts** vía `@import` en `globals.css`, con
   fallback al stack del sistema. Si el equipo necesita uso offline, se self-hostea
   la fuente en `public/fonts` sin cambiar la configuración de Tailwind.
6. **Auth.js se incorpora en la Fase 2.** En Fase 1 la home es una página estática
   de verificación; no se protege ninguna ruta todavía.
7. **Seed de Fase 1 vacío.** El seed real (admin + técnica + preguntas) se agrega en
   las fases 2 y 4. El script ya está conectado a `prisma.config.ts`.
8. **`noUncheckedIndexedAccess` activado** además de `strict`, para evitar accesos a
   índices sin verificar en las funciones de juegos.
9. **Zod 4** (versión estable actual) en lugar de Zod 3.
10. **Vitest en entorno `node`** para funciones puras. Los tests de componentes, si
    hicieran falta, usarán `jsdom` en un proyecto separado.

## Fase 2

11. **Redirect del login calculado en la server action.** `signIn` se invoca con
    `redirect: false` y, tras validar, la action hace `redirect()` según
    rol/`mustChangePassword`. Si se deja que el middleware intercepte el redirect
    del server action, Next.js muestra el contenido correcto pero conserva la URL
    anterior (`/inicio` con la pantalla de cambio de contraseña).
12. **El middleware queda como red de seguridad**, no como único mecanismo: las
    páginas de servidor vuelven a pedir `auth()` y las acciones validan la sesión.
13. **`mustChangePassword` vive en el JWT** y se actualiza con `unstable_update`
    al cambiar la contraseña. Es la única forma de que el middleware (edge) lo
    conozca sin consultar la base.
14. **Rate limit en memoria** con ventana fija de 15 minutos y 5 fallos por
    `email|IP`. Se reinicia al reiniciar el proceso y no se comparte entre
    instancias; suficiente para el MVP, a reemplazar si se despliega en varias.
15. **Playwright 1.64.1** para usar el Chromium ya cacheado en el equipo. Se agregó
    `PLAYWRIGHT_CHANNEL` como variable opcional para correr contra Chrome
    instalado (`PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`).
16. **Usuarios de e2e** se crean en `tests/e2e/global-setup.ts` con bcrypt cost 4
    (solo test) y se resetean en cada corrida. El test que cambia la contraseña del
    admin corre solo en el proyecto `chromium` para no chocar con `mobile`.
17. **Rutas placeholder** `/inicio`, `/tecnicas`, `/perfil`, `/admin/*` para que la
    navegación y los redirects funcionen desde esta fase; se completan en 3 a 6.
18. **Sin recuperación de contraseña por email** (fuera de alcance): el admin
    resetea contraseñas en la Fase 3.

## Fase 3

19. **Búsqueda de estudiantes por nombre, apellido o email.** No se busca por DNI
    para no exponer un dato personal en la URL (Ley 25.326), aunque el DNI sí se
    muestra en la tabla del admin.
20. **El reseteo de contraseña no devuelve secretos.** El admin escribe o genera
    una provisoria en el navegador y la comunica por un canal seguro; la acción
    solo guarda el hash y marca `mustChangePassword = true`.
21. **Formulario de reseteo con `<details>` nativo** para que se abra incluso si
    React todavía no hidrató la página. El mensaje de éxito se muestra fuera del
    `<details>` porque la revalidación posterior cierra el desplegable.
22. **Se restauran los valores del alta cuando hay error.** React 19 limpia los
    inputs al completar una acción; si la acción devuelve error, se repueblan
    desde lo último enviado para no obligar a reescribir todo.
23. **Errores de unicidad traducidos** desde Prisma (`P2002`) a mensajes claros
    para email y DNI.
24. **Datos de e2e:** los estudiantes creados por tests usan el prefijo `e2e.` y
    se borran al inicio de cada corrida. Los usuarios fijos de test se
    re-siembran con bcrypt cost 4.

## Fase 4

25. **Seed idempotente que reemplaza el contenido.** `seedTechnique` hace upsert de
    la técnica por `slug` y, dentro de una transacción, borra y recrea objetivos,
    materiales, pasos, imágenes, videos y check list. Conserva el `id` (y por lo
    tanto el progreso asociado) y la `version`; el seed no publica cambios por sí
    solo si la técnica ya existe.
26. **El seed también siembra insignias y actividades.** Las insignias base
    (`FIRST_READING`, `REVIEWER`, `ORDERED_MIND`, `TRIVIA_STAR`) y `MASTER_<slug>`
    se crean con `upsert` por `code`; las actividades de la técnica se recrean
    junto con el contenido. `tests/e2e/global-setup.ts` llama a las mismas
    funciones para que la base de e2e quede igual que la de desarrollo.
27. **Versionado:** guardar una técnica ya publicada incrementa `version` en 1 en
    la misma transacción. Crear un borrador deja `version = 1`; publicar o
    despublicar no cambia la versión. La UI muestra `Publicada · vN` o
    `Borrador · vN`.
28. **Edición en un solo formulario con listas ordenables por botones ↑ ↓.**
    Se evita drag & drop en el editor para mantener accesibilidad por teclado y
    simplicidad; el orden se envía como arrays y el servidor lo persiste con
    `order` secuencial.
29. **Subida de imágenes detrás de `StorageService`.** Implementación local que
    valida MIME real por extensión declarada, tamaño ≤ 5 MB y tipo
    JPEG/PNG/WebP; el nombre lo genera el servidor con UUID y se escribe en
    `public/uploads`. Cambiar a S3/objeto solo requiere otra implementación de la
    interfaz. El texto alternativo y el crédito son obligatorios en el schema.
30. **Vista previa en `/admin/tecnicas/[id]/preview`** usando el mismo componente
    de lectura que verá el estudiante (`components/technique/technique-content`).
    No registra progreso ni XP y sirve también para borradores.
31. **Videos solo de YouTube** validados con `lib/validation/techniques.ts` y
    embebidos con `youtube-nocookie.com`; un enlace inválido se muestra como
    error visible en la vista de lectura en lugar de romper la página.
32. **La ruta de preguntas queda como placeholder** en `/admin/tecnicas/[id]/preguntas`
    hasta la Fase 8, para que el editor ya tenga el acceso y no haya que cambiar
    la navegación después.
33. **Sincronización de estado del editor.** Tras guardar o publicar, el cliente
    sincroniza `version` y `published` con lo que devuelve el servidor sin pisar
    los campos que la persona está editando.
