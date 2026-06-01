# Tests E2E — Palen Tour

Tests end-to-end con [Playwright](https://playwright.dev/).

## Instalación

```bash
npm install
npx playwright install chromium
```

## Configuración previa

Los tests leen las credenciales del usuario de prueba desde variables de entorno
para no dejar datos sensibles en el repositorio. En `.env.local` añade:

```
E2E_USER_EMAIL=tu-usuario-de-prueba@example.com
E2E_USER_PASSWORD=tu-password
E2E_TRIP_ID=1
```

`.env.local` está gitignored. Hay una plantilla en `.env.example`.

## Ejecución

Asegúrate de que el dev server pueda arrancar (`npm run dev`). El propio Playwright lo arranca via `webServer` en `playwright.config.js`.

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # modo UI interactivo
npm run test:e2e:report   # ver el último reporte HTML
```

## Estructura

- `inscripcion-viaje.spec.js` — flujo completo: login (credenciales por env) + inscripción de 2 personas al viaje configurado (Sierra Nevada por defecto).
