export function toast(message) {
  window.dispatchEvent(new CustomEvent('albhitai-toast', { detail: message }))
}

export function requestPrint(doc) {
  window.dispatchEvent(new CustomEvent('albhitai-print', { detail: doc }))
}
