import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import './styles.css'

function blockUnneededInteraction(event: Event) {
  event.preventDefault()
}

// Esta aplicación no contiene texto editable, imágenes arrastrables ni menús
// contextuales útiles. Bloquearlos evita que una pulsación larga saque al niño
// de la actividad o cubra el juego con controles del navegador.
document.addEventListener('contextmenu', blockUnneededInteraction)
document.addEventListener('dragstart', blockUnneededInteraction)
document.addEventListener('selectstart', blockUnneededInteraction)

document.addEventListener('selectionchange', () => {
  const selection = document.getSelection()

  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges()
  }
})

registerSW({
  immediate: true,
})

createApp(App).mount('#app')
