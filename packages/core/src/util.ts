import type { Application } from "./application.js";

export function setupApplicationSignals(application: Application) {
  if (Object.hasOwn(globalThis, 'window') && Object.hasOwn(globalThis.window, 'document')) {
    // Browser
    globalThis.window.document.addEventListener('close', async () => {
      if (application.getApplicationState() !== 'running') return;
      await application.stop()
    }, {once: true})
    return;
  }
  
  if (Object.hasOwn(globalThis, 'process')) {
    // Node
    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
      (globalThis as unknown as {process: {on: Function}}).process.on(signal, async () => {
        if (application.getApplicationState() !== 'running') return;
        await application.stop()
      })
    })
    return;
  }

  throw new Error("Environment not supported")
}