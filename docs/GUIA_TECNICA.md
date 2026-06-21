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

### Rondas binarias por propiedad

Los juegos «Frío o calor» y «Grande o pequeño» reutilizan `ChoiceGame.vue`,
pero no preguntan por la identidad de un objeto. Preguntan por una propiedad
semántica:

```ts
temperature?: 'cold' | 'hot'
size?: 'small' | 'large'
```

En cada ronda el motor:

1. Elige el concepto solicitado: frío o caliente.
2. Selecciona un elemento con esa propiedad.
3. Selecciona un distractor con la propiedad contraria.
4. Baraja las dos opciones.
5. Evalúa la respuesta mediante el `id` del elemento correcto.

El concepto solicitado se alterna después de cada acierto para garantizar que
el niño practique ambas direcciones y no reciba varias preguntas iguales por
azar. La pregunta visible y hablada se deriva de `targetConcept`, mientras que
`target` continúa apuntando a la carta correcta.

En el juego de tamaños, las dos cartas representan el mismo objeto. Solo cambia
su escala. Esta restricción evita enseñar asociaciones accidentales como
«elefante significa grande» y permite concentrarse exclusivamente en el
contraste grande/pequeño. Tras un acierto cambia el objeto y se alterna el
concepto solicitado.

Este patrón permite añadir otros contrastes binarios —arriba/abajo o
día/noche— sin crear necesariamente un motor nuevo.

### Barajado

La implementación usa Fisher-Yates y acepta un generador aleatorio inyectable:

```ts
shuffled(items, random)
```

En producción `random` es `Math.random`. En tests se sustituye por una función
determinista para comprobar rondas concretas sin depender del azar.

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

### Variedad de contenidos sin aumentar la dificultad

Los catálogos contienen más conceptos que los mostrados simultáneamente:

- Formas, colores y números: seis conceptos.
- Animales: ocho.
- Frío o calor: cinco ejemplos por cada propiedad.
- Grande o pequeño: cinco objetos, cada uno con dos escalas.
- Parejas de color y forma: seis conceptos disponibles.
- Animal y hogar: cinco asociaciones disponibles.

Una ronda de elección sigue mostrando como máximo tres respuestas, y los
tableros de parejas mantienen tres relaciones. El catálogo ampliado aporta
variedad entre rondas sin incrementar la carga cognitiva de cada interacción.

Las formas nuevas —rectángulo y corazón— se dibujan con CSS, como el resto. Los
nuevos contenidos basados en objetos y animales continúan usando emoji para
mantener la PWA ligera y completamente offline.

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

Los juegos admiten dos modos:

- `identical`: las dos cartas contienen el mismo concepto, como color o forma.
- `association`: las cartas son distintas, pero comparten un `pairId`
  conceptual.

«Animal y su hogar» usa el segundo modo para relacionar perro–caseta,
pájaro–nido y abeja–colmena. La selección puede comenzar por cualquiera de las
dos cartas. El feedback cambia de «¡Son iguales!» a «¡Van juntos!» para no
confundir identidad con relación.

Todos reutilizan `GameVisual.vue`, por lo que las reglas gráficas permanecen
consistentes con los juegos de selección.

## 6. Audio: voz y sonidos reales

Hay dos canales de audio distintos:

- `SpeechSynthesisUtterance` para frases en español.
- `HTMLAudioElement` para los sonidos de animales.

La voz se gestiona desde `useSpeech.ts`, compartido por todos los motores. El
composable evita que cada componente configure y cancele la síntesis de forma
distinta.

### Selección de una voz más natural

`speechSynthesis.getVoices()` no siempre devuelve voces durante la primera
lectura, especialmente en Safari. El servicio:

1. Consulta inmediatamente las voces disponibles.
2. Escucha `voiceschanged`.
3. Actualiza una caché cuando el sistema termina de cargar el catálogo.
4. Continúa usando `es-ES` como fallback si el catálogo sigue vacío.

Las voces se ordenan mediante una puntuación:

- Prioridad máxima para `es-ES`.
- Bonificación para voces locales, que funcionan offline.
- Bonificación para nombres conocidos de voces femeninas de Apple, Google y
  Microsoft.
- Fallback a cualquier voz española y, finalmente, a la voz elegida por el
  navegador.

La selección exacta sigue dependiendo de las voces instaladas en el sistema.
iOS, Android, Windows y macOS pueden producir resultados diferentes aunque
reciban la misma configuración.

La locución usa parámetros menos artificiales:

```ts
utterance.rate = 0.9
utterance.pitch = 1
utterance.volume = 1
```

Antes de hablar se normalizan espacios y puntuación. Las frases sin cierre
reciben un punto para ayudar al sintetizador a producir una cadencia completa.

### Cancelación segura

El servicio mantiene una única locución activa. Al iniciar otra:

1. Cancela la síntesis anterior.
2. Resuelve manualmente su promesa.
3. Registra la nueva locución.

Resolver manualmente es importante porque algunos navegadores no disparan de
forma consistente `onend` u `onerror` después de `cancel()`. Sin esta protección
un `await speak(...)` podría bloquear indefinidamente la transición de ronda.

Cuando el usuario desactiva la voz o sale de un juego, el composable cancela y
resuelve cualquier locución activa.

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
3. Suite unitaria y umbrales mediante `npm run test:coverage`.
4. Type-check explícito mediante `npm run typecheck`.
5. Build de producción mediante `npm run build`.
6. Configuración de Pages.
7. Subida de `dist` como artifact.
8. Despliegue en el entorno `github-pages`.

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

## 15. Tests automatizados

La aplicación usa Vitest, Vue Test Utils, Happy DOM y el proveedor V8 de
cobertura. Los comandos disponibles son:

```bash
npm test
npm run test:watch
npm run test:coverage
npm run typecheck
```

La cobertura genera salida de terminal y reportes JSON y HTML dentro de
`coverage/`. El CI exige un mínimo global del 90 % en:

- Statements.
- Branches.
- Functions.
- Lines.

No se fuerzan tests artificiales para CSS, declaraciones de tipos, imágenes o
sonidos. Esos recursos se validan mediante TypeScript, el build, los tests de
renderizado y las invariantes de datos.

### Lógica pura y aleatoriedad

La construcción de rondas vive en `src/gameLogic.ts`. Sus funciones reciben un
generador aleatorio opcional:

```ts
createChoiceRound(game, avoidId, previousTemperature, random, previousSize)
createPairCards(game, random)
```

En producción se usa `Math.random`. En tests se inyectan secuencias
deterministas, por lo que se pueden comprobar objetivos, distractores,
alternancia frío/calor, alternancia de tamaños y asociaciones sin tests
probabilísticos.

### Mocks del navegador

La suite proporciona dobles controlados para:

- `speechSynthesis` y `SpeechSynthesisUtterance`.
- Lista tardía de voces y evento `voiceschanged`.
- Errores, cancelaciones y excepciones del motor de voz.
- Temporizadores de feedback y reinicio.
- Audio nativo mientras las grabaciones animales están desactivadas.
- Registro del service worker de la PWA.

Los tests de componentes verifican navegación, control global de voz, aciertos,
errores, bloqueo de pulsaciones simultáneas, progreso, reinicios y todas las
representaciones visuales. Las invariantes de `games.ts` evitan ids duplicados,
opciones incompletas o juegos de parejas imposibles.

### Fallos seguros de voz

`useSpeech` resuelve su promesa tanto ante `onend` y `onerror` como si
`speechSynthesis.speak()` lanza una excepción síncrona. Cancelar, desactivar la
voz o desmontar el componente también libera la locución activa. De este modo,
un fallo del sintetizador nunca bloquea la siguiente ronda.

## 16. Validación realizada

Para cada cambio relevante se ejecutó:

```bash
npm run test:coverage
npm run typecheck
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

## 17. Deuda técnica y siguientes pasos

### Pruebas de navegador

La capa unitaria ya cubre la lógica y los componentes. Las siguientes mejoras
recomendables serían:

- Playwright para flujos completos en navegadores reales.
- Lighthouse CI para PWA, rendimiento y accesibilidad.
- Pruebas periódicas sobre iOS y Android físicos, especialmente para voz.

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

## 18. Cómo añadir un nuevo juego similar

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
