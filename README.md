# Peque Aprende

Una pequeña colección de minijuegos para acompañar a niños y niñas de 2–3 años
en el aprendizaje de formas, colores y cantidades.

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

## Despliegue en GitHub Pages

`vite.config.ts` usa rutas relativas (`base: './'`), por lo que el contenido de
`dist/` puede publicarse tanto en un repositorio de proyecto como en un dominio
propio.

```bash
npm run build
```
