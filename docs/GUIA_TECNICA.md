# Guía técnica de Peque Aprende

Este documento resume las decisiones de ingeniería, patrones y problemas
resueltos durante la construcción de la aplicación. Está pensado como material
de aprendizaje y como mapa para futuras ampliaciones.

## 1. Stack y objetivos arquitectónicos

La aplicación utiliza:

- Vue 3 con Composition API y componentes `script setup`.
- TypeScript en modo estricto.
- Vite como servidor de desarrollo y sistema de compilación.
- `vite-plugin-pwa` y Workbox para instalación y funcionamiento offline.
- GitHub Actions para integración y despliegue continuo.
- GitHub Pages como alojamiento estático.
- Web Speech API para las instrucciones habladas.
- HTML Audio para los sonidos reales de animales.

No existe backend, autenticación, base de datos ni estado remoto. Es una
aplicación estática diseñada para:

1. Cargar rápidamente.
2. Funcionar sin conexión tras la primera visita.
3. Tener pocas dependencias de ejecución.
4. Permitir añadir contenido sin duplicar la lógica de juego.

## 2. Estructura del proyecto

```text
.
├── .github/workflows/deploy-pages.yml
├── docs/GUIA_TECNICA.md
├── public/
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── sounds/
├── src/
│   ├── components/
│   │   ├── ChoiceGame.vue
│   │   ├── PairGame.vue
│   │   └── GameVisual.vue
│   ├── data/games.ts
│   ├── types/game.ts
│   ├── App.vue
│   ├── main.ts
│   └── styles.css
├── index.html
└── vite.config.ts
```

La separación importante es:

- `games.ts` contiene contenido y configuración.
- `ChoiceGame.vue` contiene el comportamiento común.
- `PairGame.vue` contiene la mecánica de relacionar dos cartas iguales.
- `GameVisual.vue` traduce datos a una representación visual.
- `App.vue` se limita a la navegación entre portada y juego.

Este enfoque data-driven evita crear un componente completo para cada
minijuego que comparte la mecánica «escucha, observa y elige».

La portada añade un nivel de navegación mediante `GameCategory`. Actualmente
hay dos categorías:

- `choose`: juegos de selección con tres respuestas.
- `pairs`: juegos de emparejar seis cartas.

Cada categoría apunta a su propio motor, pero ambas reutilizan la misma capa de
datos visuales.

## 3. Modelado extensible de minijuegos

El dominio se modela mediante `GameDefinition` y `GameOption`:

```ts
export type GameKind = 'shape' | 'color' | 'number' | 'animal'

export interface GameDefinition {
  id: string
  title: string
  shortTitle: string
  instruction: string
  icon: string
  accent: string
  kind: GameKind
  options: GameOption[]
}
```

`GameKind` actúa como discriminador visual. Cada opción contiene únicamente los
campos necesarios para su tipo: `shape`, `number`, `animal`, `sound`, etc.

### Ventaja

Añadir más colores o animales solo requiere editar datos. Añadir un nuevo tipo
visual requiere:

1. Ampliar `GameKind`.
2. Añadir los campos correspondientes a `GameOption`.
3. Renderizar el nuevo tipo en `GameVisual.vue`.
4. Registrar el juego en `games.ts`.

### Mejora futura

El modelo actual usa propiedades opcionales. Si el número de tipos crece,
conviene migrar a una unión discriminada para que TypeScript impida estados
inválidos:

```ts
type GameOption =
  | { kind: 'number'; id: string; label: string; number: number }
  | { kind: 'animal'; id: string; label: string; animal: string; sound: string }
```

Esto evita, por ejemplo, que una opción animal se construya sin sonido o que
una forma incluya accidentalmente un número.

## 4. Motor de rondas

`ChoiceGame.vue` funciona como un pequeño motor reutilizable:

1. Selecciona un objetivo.
2. Construye tres opciones: la correcta y dos distractores.
3. Baraja las opciones.
4. Reproduce la instrucción.
5. Procesa el toque.
6. Muestra feedback.
7. Genera una nueva ronda evitando repetir inmediatamente el objetivo.

El estado principal se mantiene con `ref`:

```ts
const target = ref<GameOption>()
const choices = ref<GameOption[]>([])
const answerState = ref<'idle' | 'right' | 'try-again'>('idle')
const selectedId = ref<string | null>(null)
const isResponding = ref(false)
```

`isResponding` es importante porque el flujo contiene operaciones asíncronas.
Sin este bloqueo, varios toques rápidos podrían iniciar sonidos, feedback y
temporizadores simultáneos.

### Máquina de estados implícita

Aunque no se usa una librería de state machines, el componente tiene estos
estados conceptuales:

```text
idle → evaluating → right → next round
                  ↘ try-again → idle
```

Si aparecen más fases, animaciones o niveles, sería razonable convertirlo en
un reducer explícito o utilizar XState.

### Barajado

La implementación actual usa:

```ts
[...items].sort(() => Math.random() - 0.5)
```

Es suficiente para una experiencia infantil no competitiva, pero no produce
una distribución matemáticamente uniforme. Para juegos evaluables o análisis
estadístico debería sustituirse por Fisher-Yates.

## 5. Representación visual desacoplada

`GameVisual.vue` recibe una opción y su tipo. El motor no conoce si está
mostrando un círculo, el número tres o un gato.

Las formas se construyen con CSS:

- Círculo mediante `border-radius`.
- Triángulo mediante bordes.
- Estrella mediante `clip-path`.

Los animales usan emoji. Esto reduce peso y evita licencias de ilustraciones,
pero su apariencia varía entre sistemas operativos. Una futura dirección sería
utilizar SVG propios para obtener consistencia visual entre iOS, Android y
escritorio.

## 5.1 Motor de parejas

`PairGame.vue` implementa una segunda mecánica sin duplicar la representación
de colores y formas. Cada ronda selecciona tres opciones y crea dos instancias
de cada una:

```ts
selectedOptions.flatMap((option) => [
  { cardId: `${option.id}-a`, pairId: option.id, option },
  { cardId: `${option.id}-b`, pairId: option.id, option },
])
```

La distinción entre `cardId` y `pairId` es importante:

- `cardId` identifica una carta física y permite seleccionar una sola copia.
- `pairId` expresa la identidad conceptual que deben compartir las dos cartas.

El flujo es:

```text
ninguna seleccionada
  → primera carta
  → segunda carta
    → mismo pairId: marcar pareja
    → distinto pairId: mostrar error y liberar ambas
```

`isChecking` actúa como mutex de interfaz durante la evaluación y los
temporizadores. Evita que un tercer toque altere el estado antes de resolver
las dos cartas actuales.

Las parejas encontradas quedan deshabilitadas y visibles. Esta decisión reduce
la carga de memoria respecto a un memory clásico con cartas ocultas y resulta
más adecuada para 2–3 años: el aprendizaje es relacionar propiedades, no
recordar posiciones.

Los minijuegos iniciales son:

- Parejas por color.
- Parejas por forma.

Ambos reutilizan `GameVisual.vue`, por lo que las reglas gráficas permanecen
consistentes con los juegos de selección.

## 6. Audio: voz y sonidos reales

Hay dos canales de audio distintos:

- `SpeechSynthesisUtterance` para frases en español.
- `HTMLAudioElement` para los sonidos de animales.

Los sonidos reales están temporalmente desactivados mediante
`animalSoundsEnabled = false`. La voz sintética permanece activa. Mantener el
interruptor junto a la lógica de reproducción permite reactivarlos cuando se
reemplacen los clips sin reconstruir la secuenciación asíncrona.

Ambos se envuelven en promesas para poder secuenciarlos:

```ts
await speak('Toca el animal: perro')
await playAnimalSound(perro)
```

Al seleccionar:

```ts
await playAnimalSound(option)
await speak('¡Muy bien! perro')
```

Esto evita que la voz y el sonido se reproduzcan a la vez.

### Cancelación y limpieza

Solo puede existir un audio activo:

```ts
let activeAudio: HTMLAudioElement | null = null
```

Antes de iniciar otro se detiene el anterior, se reinicia su posición y se
limpia el temporizador. En `onBeforeUnmount` también se cancelan audio y voz.
Esto evita sonidos «fantasma» después de volver al menú.

### Duración limitada

Algunos archivos originales son largos. Cada animal define `soundDuration`,
que actúa como timeout máximo. Así se utiliza solo el fragmento inicial útil y
la ronda no queda bloqueada esperando a que termine una grabación completa.

### Resolución de rutas

Los sonidos se resuelven con:

```ts
new URL(option.sound, document.baseURI).href
```

Es preferible a una ruta absoluta como `/sounds/cat.ogg`, porque GitHub Pages
publica la aplicación bajo `/learn-and-play/`, no en la raíz del dominio.

### Restricciones de reproducción móvil

iOS y Android pueden impedir audio iniciado sin un gesto del usuario. El audio
al seleccionar una opción siempre parte de un toque. La reproducción automática
de la primera instrucción depende de las políticas del navegador; por eso la
tarjeta de instrucción también es un botón para repetirla manualmente.

## 7. Audio offline y licencias

Los clips viven en `public/sounds`, por lo que Vite los copia sin transformar.
Mientras los sonidos están desactivados, Workbox excluye `ogg` y `wav` del
precache:

```ts
globPatterns: ['**/*.{js,css,html,svg,png,woff2,txt}']
```

Así la PWA no descarga varios megabytes de audio que no va a reproducir. Cuando
se incorporen las grabaciones definitivas, habrá que volver a incluir sus
extensiones para recuperar el funcionamiento offline.

Los sonidos proceden de Wikimedia Commons. Se verificaron individualmente:

- URL del archivo.
- Autor.
- Licencia.
- Formato y MIME.
- Duración y tamaño.

La atribución se conserva en:

- `README.md`.
- `public/sounds/ATTRIBUTION.txt`.

La segunda copia también queda cacheada offline. Esto es especialmente
importante para archivos CC BY y CC BY-SA.

## 8. PWA y service worker

`vite-plugin-pwa` genera:

- `manifest.webmanifest`.
- `sw.js`.
- El runtime de Workbox.
- El registro automático del service worker.

La configuración clave del manifest es:

```ts
display: 'standalone',
scope: './',
start_url: './',
theme_color: '#f6d558',
background_color: '#d7e6dc',
```

`display: 'standalone'` elimina la interfaz normal del navegador cuando la
aplicación se abre desde la pantalla de inicio.

`scope` y `start_url` relativos son fundamentales para que funcione en la
subruta de GitHub Pages.

### Estrategia de actualización

```ts
registerType: 'autoUpdate'
```

El service worker descarga nuevas versiones automáticamente. Una PWA abierta
puede seguir mostrando temporalmente el bundle anterior hasta reiniciarse o
recargarse. Por eso, tras un despliegue, a veces hay que cerrar y volver a abrir
la aplicación instalada.

### Estrategias de caché

- Recursos propios: precache versionado por Workbox.
- CSS de Google Fonts: `StaleWhileRevalidate`.
- Archivos de fuente: `CacheFirst` con expiración de un año.
- Navegación: fallback a `index.html`.

El fallback permite que la SPA siga arrancando offline.

### Trade-off del precache

Los sonidos elevan el precache a unos 4 MB. Es aceptable para este caso, pero
cada sonido nuevo aumenta el coste de la primera instalación. Si el catálogo
crece, convendría:

- Convertir WAV a Opus/AAC.
- Cachear audio bajo demanda.
- Separar paquetes por minijuego.

## 9. Compatibilidad con GitHub Pages

Vite se configura con:

```ts
base: './'
```

Esto genera referencias relativas en el HTML compilado. Sin ello, una
aplicación publicada en:

```text
https://usuario.github.io/repositorio/
```

podría intentar cargar recursos desde:

```text
https://usuario.github.io/assets/...
```

en vez de:

```text
https://usuario.github.io/repositorio/assets/...
```

## 10. CI/CD con GitHub Actions

Cada `push` a `main` ejecuta:

1. Checkout.
2. Instalación reproducible con `npm ci`.
3. Type-check y build mediante `npm run build`.
4. Configuración de Pages.
5. Subida de `dist` como artifact.
6. Despliegue en el entorno `github-pages`.

El workflow declara permisos mínimos:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

También utiliza concurrencia:

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

Si se hacen varios pushes seguidos, se cancela el despliegue obsoleto y solo
continúa el más reciente.

## 11. Interacción táctil orientada a niños

Una pulsación larga en iOS puede seleccionar texto y mostrar controles del
sistema. Para una aplicación sin campos editables eso no aporta valor y
entorpece el juego.

Se deshabilitaron:

- Selección de texto.
- Menú contextual.
- Arrastre nativo.
- Callout táctil de WebKit.
- Resaltado visual del tap.
- Overscroll y pull-to-refresh accidental.
- Zoom por doble toque sobre controles mediante `touch-action: manipulation`.

La protección combina CSS y eventos:

```css
.app-shell {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

button {
  touch-action: manipulation;
}
```

```ts
document.addEventListener('contextmenu', preventDefault)
document.addEventListener('dragstart', preventDefault)
document.addEventListener('selectstart', preventDefault)
```

Se conservan:

- Scroll vertical cuando el contenido no cabe.
- Foco visible de teclado.
- Roles y nombres accesibles.
- Botones nativos.

Es una decisión deliberada: reducir gestos accidentales sin degradar la
semántica ni bloquear completamente tecnologías de asistencia.

## 12. Responsive design

La interfaz usa tres disposiciones principales:

- Escritorio ancho: cuatro tarjetas de juego.
- Tablet: cuadrícula de dos columnas.
- Móvil: una columna con tarjetas horizontales.

Dentro del juego:

- Tablet/escritorio: tres opciones en una fila.
- Móvil: tres opciones grandes apiladas.

Se usan `clamp`, `dvh`, Grid y Flexbox para evitar depender de tamaños fijos.
`100dvh` responde mejor que `100vh` a las barras móviles dinámicas.

## 13. Accesibilidad

Aunque el usuario principal aún no lee, la semántica sigue siendo valiosa:

- Todos los controles son `button`.
- Cada opción tiene un nombre accesible.
- Los elementos decorativos usan `aria-hidden`.
- El progreso tiene una etiqueta.
- El botón de sonido expone `aria-pressed`.
- Existe `:focus-visible`.
- Se respeta `prefers-reduced-motion`.

Los colores no son el único canal de feedback: también hay texto, voz,
animación y cambios de fondo.

## 14. Decisiones de UX infantil

Las restricciones del producto han influido directamente en la ingeniería:

- Tres opciones por ronda reducen carga cognitiva.
- No hay cronómetro ni penalización.
- Una respuesta errónea permite reintentar la misma ronda.
- El objetivo siguiente no repite inmediatamente el anterior.
- Los controles son grandes y están separados.
- No hay anuncios, enlaces externos, puntuaciones infinitas ni notificaciones.
- El adulto puede repetir la instrucción tocando la tarjeta superior.

La aplicación evita gamificación agresiva. El feedback confirma el aprendizaje,
no intenta prolongar artificialmente la sesión.

## 15. Validación realizada

Para cada cambio relevante se ejecutó:

```bash
npm run build
git diff --check
```

La comprobación del navegador incluyó:

- Vista móvil y tablet.
- Navegación entre portada y juegos.
- Respuesta correcta e incorrecta.
- Consola sin errores.
- Recursos de GitHub Pages.
- Manifest y service worker.
- URLs y MIME de todos los audios.
- Estado exitoso del workflow de despliegue.
- Sincronización entre `HEAD` y `origin/main`.

## 16. Deuda técnica y siguientes pasos

### Tests automatizados

Actualmente las pruebas son manuales. La siguiente inversión recomendable sería:

- Vitest para selección de rondas y estados.
- Vue Test Utils para interacción de componentes.
- Playwright para los flujos principales.
- Lighthouse CI para PWA, rendimiento y accesibilidad.

### Gestión de audio

Conviene extraer la lógica a un composable:

```text
src/composables/useAudioGuide.ts
```

Esto permitiría centralizar colas, cancelación, volumen, errores y políticas de
autoplay.

### Persistencia

Se podría usar `localStorage` para recordar:

- Preferencia de sonido.
- Último juego utilizado.
- Dificultad elegida por el adulto.

No sería recomendable almacenar perfiles infantiles ni telemetría sin una
necesidad clara y una revisión específica de privacidad.

### Modo adulto

Los ajustes deberían quedar detrás de una interacción difícil de activar por
accidente, por ejemplo mantener pulsado un icono y resolver una operación
sencilla. Allí podrían configurarse duración de sesión, volumen y juegos
disponibles.

### Rendimiento

Las mejoras con más impacto serían:

1. Comprimir WAV a Opus.
2. Alojar las fuentes localmente.
3. Precargar únicamente el audio de las tres opciones actuales.
4. Añadir presupuestos de tamaño al workflow.

## 17. Cómo añadir un nuevo juego similar

Para un juego de vehículos:

1. Añadir `'vehicle'` a `GameKind`.
2. Añadir `vehicle?: string` o migrar a una unión discriminada.
3. Implementar la vista en `GameVisual.vue`.
4. Añadir sus opciones a `games.ts`.
5. Si tiene sonidos, guardarlos en `public/sounds`.
6. Documentar licencia y autor.
7. Comprobar que Workbox incluye su extensión.
8. Ejecutar build, probar móvil/tablet y desplegar.

La idea central es mantener una sola mecánica de ronda y tratar los nuevos
conceptos principalmente como datos.
