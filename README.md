# Peque Aprende

Una pequeña colección de minijuegos para acompañar a niños y niñas de 2–3 años
en el aprendizaje de formas, colores y cantidades.

La arquitectura, PWA, audio, despliegue y decisiones de interacción están
explicadas en la [guía técnica](docs/GUIA_TECNICA.md).

## Instalar como aplicación

La web es una PWA y puede utilizarse sin conexión una vez visitada:

- En iPhone o iPad: Safari → Compartir → Añadir a pantalla de inicio.
- En Android: menú del navegador → Instalar aplicación.

## Desarrollo

```bash
npm install
npm run dev
```

## Añadir un minijuego

La primera versión usa un motor común de elección visual. Para añadir otro juego
del mismo tipo:

1. Añade sus opciones y metadatos a `src/data/games.ts`.
2. Si necesita una representación nueva, amplía `GameKind` y `GameVisual.vue`.

La portada agrupa los juegos en categorías. Los juegos de elección usan
`ChoiceGame.vue`; los juegos de emparejar usan `PairGame.vue` y se registran en
`pairGames` dentro de `src/data/games.ts`.

`ChoiceGame.vue` también admite rondas binarias basadas en una propiedad. El
juego «Frío o calor» selecciona un elemento frío y otro caliente y alterna el
concepto solicitado.

## Créditos de sonido

> Los sonidos de animales están desactivados temporalmente. La voz de las
> instrucciones continúa funcionando. Los archivos y metadatos se conservan
> para facilitar su sustitución por grabaciones propias.

Los sonidos de animales se descargan con la aplicación para poder jugar sin
conexión. Proceden de Wikimedia Commons:

- Gato: [Maullido de gata hembra joven](https://commons.wikimedia.org/wiki/File:Maullido_de_gata_hembra_joven.ogg), George Miquilena, CC0.
- Perro: [Voice Test Error](https://commons.wikimedia.org/wiki/File:Voice_Test_Error.wav), Kineticsquid, CC0.
- Vaca: [Cow in Antefasy](https://commons.wikimedia.org/wiki/File:Cow_in_Antefasy.wav), Gasybeaugosse2020, CC0.
- Pato: [Domestic duck sound 01](https://commons.wikimedia.org/wiki/File:Domestic_duck_sound_01.wav), Ganesh Mohan T, CC BY-SA 4.0.
- León: [Lionroar](https://commons.wikimedia.org/wiki/File:Lionroar.wav), Jonathan Growcott et al., CC BY 4.0.
- Elefante: [Elephant voice - trumpeting](https://commons.wikimedia.org/wiki/File:Elephant_voice_-_trumpeting.ogg), தகவலுழவன், CC0.

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` compila y publica la aplicación
automáticamente cuando se suben cambios a `main`.

La aplicación estará disponible en:

https://jlaguilargomez.github.io/learn-and-play/

`vite.config.ts` usa rutas relativas (`base: './'`), por lo que los recursos
funcionan bajo la ruta del repositorio y también en un dominio propio.

```bash
npm run build
```
