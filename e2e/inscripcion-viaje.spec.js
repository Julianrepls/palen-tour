import { test, expect } from '@playwright/test';

// Credenciales del usuario de prueba. Se leen de variables de entorno cargadas
// desde .env.local (gitignored) por playwright.config.js. Nunca poner valores reales aquí.
const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const TRIP_ID = Number(process.env.E2E_TRIP_ID ?? 1);

if (!USER_EMAIL || !USER_PASSWORD) {
  throw new Error(
    'Faltan E2E_USER_EMAIL y/o E2E_USER_PASSWORD en .env.local. ' +
    'Copia .env.example y rellena los valores.'
  );
}

async function login(page) {
  await page.goto('/');
  await expect(page).toHaveTitle(/Palen Tour/);
  await page.getByRole('link', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/.*\/login/);
  await page.getByRole('textbox', { name: 'Email' }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/.*\/mi-cuenta/);
}

test.describe('Inscripción a un viaje', () => {
  test('login y verificación de inscripción a Sierra Nevada (viaje 1)', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await login(page);

    await page.goto(`/viajes/${TRIP_ID}`);
    await expect(
      page.getByRole('heading', { name: /Sierra Nevada: Ruta de los Tres Mil/ })
    ).toBeVisible();

    const yaInscrito = page.getByRole('heading', { name: 'Ya estás inscrito' });
    const inscribeteAhora = page.getByRole('heading', { name: 'Inscríbete ahora' });

    // Esperamos a que la página termine de cargar y muestre uno de los dos estados.
    await expect(yaInscrito.or(inscribeteAhora)).toBeVisible({ timeout: 15_000 });

    // El componente puede oscilar brevemente al hidratar la sesión de Supabase
    // (auth state ready → refetch del booking). Dejamos que el DOM se estabilice.
    await page.waitForLoadState('networkidle');

    if ((await inscribeteAhora.isVisible()) && !(await yaInscrito.isVisible())) {
      // Caso: sin inscripción previa → rellenamos y enviamos.
      await page.locator('form select').selectOption('2');
      await page
        .getByPlaceholder('Alergias, necesidades especiales, preguntas...')
        .fill('Sin alergias. Llegaré con mi pareja.');

      await expect(page.getByText('378€')).toBeVisible();
      await expect(page.getByText('(2 personas)')).toBeVisible();

      await page.getByRole('button', { name: 'Solicitar inscripción' }).click();
      await expect(yaInscrito).toBeVisible({ timeout: 15_000 });
    }

    // Estado final esperado en ambos casos
    await expect(yaInscrito).toBeVisible();
    await expect(page.getByText('Pendiente de confirmación')).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancelar inscripción/ })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ver todas mis inscripciones' })
    ).toBeVisible();
  });

  test('login con credenciales inválidas no entra al área de cliente', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill('nope@example.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('wrongwrong');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).not.toHaveURL(/.*\/mi-cuenta/);
  });

  test('home: hero y listado de próximos viajes visibles', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Descubre el mundo con Palen Tour/ })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Próximos viajes' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Sierra Nevada: Ruta de los Tres Mil/ })
    ).toBeVisible();
  });
});
