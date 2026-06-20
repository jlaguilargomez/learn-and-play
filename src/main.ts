import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { installInteractionGuards } from './interactionGuards'
import './styles.css'

// Esta aplicación no contiene texto editable, imágenes arrastrables ni menús
// contextuales útiles. Bloquearlos evita que una pulsación larga saque al niño
// de la actividad o cubra el juego con controles del navegador.
installInteractionGuards()

registerSW({
  immediate: true,
})

createApp(App).mount('#app')
