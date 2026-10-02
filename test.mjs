import { chromium } from 'playwright';
import { readFileSync } from 'fs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });

  page.on('console', msg => { if (msg.type() === 'error') console.log('CE:', msg.text()); });
  page.on('pageerror', e => console.log('ERR:', e.message));

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#tabla-body tr');

  await page.fill('#tema', 'Test');
  await page.fill('#fecha', '2026-05-26');
  await page.fill('#hora-inicio', '08:00');
  await page.fill('#hora-fin', '10:00');
  await page.fill('#area', 'Test');
  await page.fill('#expositor', 'Test');

  // Check some activity types
  await page.check('label:has-text("Capacitación") input');
  await page.check('label:has-text("Taller") input');
  await page.check('label:has-text("Inducción") input');

  for (let i = 3; i < 50; i++) await page.click('#agregar-fila');
  const dl = page.waitForEvent('download', { timeout: 180000 });
  await page.click('#guardar-pdf');
  const d = await dl;

  const { join } = await import('path');
  const { existsSync, mkdirSync } = await import('fs');
  const out = join(import.meta.dirname, 'test-out');
  if (!existsSync(out)) mkdirSync(out);
  await d.saveAs(join(out, 'result.pdf'));

  const content = readFileSync(join(out, 'result.pdf'), 'latin1');
  const pages = (content.match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log('Pages:', pages, '| OK');
  await browser.close();
}
run().catch(e => { console.error('FAIL:', e); process.exit(1); });
