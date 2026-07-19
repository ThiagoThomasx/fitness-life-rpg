// Polyfill de IndexedDB para os testes de `body-progress-photo-db.ts` sob
// Vitest/jsdom, que não implementa IndexedDB nativamente.
import 'fake-indexeddb/auto'
