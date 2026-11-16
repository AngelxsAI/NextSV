import { test, expect } from '@playwright/test';
test('sitio vacío muestra estado real y navegación accesible', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Explorar productos' }),
  ).toBeVisible();
  await expect(page.getByText('Pronto habrá novedades aquí')).toBeVisible();
  await page.getByRole('link', { name: 'Explorar productos' }).click();
  await expect(page).toHaveURL(/catalogo/);
  await expect(page.getByLabel('Buscar productos')).toBeVisible();
});
test('rutas privadas redirigen al acceso', async ({ page }) => {
  await page.goto('/admin/productos');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByText('Primero conecta tu proyecto')).toBeVisible();
});
test('API rechaza lectura y escritura no autorizadas', async ({ request }) => {
  const read = await request.get('/api/admin/products');
  expect(read.status()).toBe(401);
  const write = await request.post('/api/admin/products', {
    headers: { Origin: 'https://malicioso.example' },
    data: { name: 'Ataque' },
  });
  expect(write.status()).toBe(403);
});
test('cabeceras y robots protegen administración', async ({ request }) => {
  const response = await request.get('/login');
  expect(response.headers()['content-security-policy']).toContain(
    "object-src 'none'",
  );
  expect(response.headers()['cache-control']).toContain('no-store');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /admin');
});
test('sin desbordamiento horizontal y modo oscuro funcional', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
});
