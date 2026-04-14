import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// When user taps a notification: focus/open the app and navigate to the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url ?? '/'
  // Build full app URL: scope is e.g. https://.../chipie_miam/
  const appUrl = self.registration.scope.replace(/\/$/, '') + '/#' + url

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if ('focus' in client) {
            void client.focus()
            client.postMessage({ type: 'NAVIGATE', url })
            return undefined
          }
        }
        return self.clients.openWindow(appUrl)
      })
  )
})
