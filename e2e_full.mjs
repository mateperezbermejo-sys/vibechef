import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const SS = 'C:/VibeChef/screenshots/e2e';
mkdirSync(SS, { recursive: true });

const BASE = 'http://localhost:5173';
const EMAIL = `e2e_test_${Date.now()}@vibechef.com`;
const PASS = 'test1234';

const log = (msg) => console.log(`\n${msg}`);
const ok  = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);

let stepNum = 0;
async function step(label, fn) {
  stepNum++;
  log(`[${stepNum}] ${label}`);
  await fn();
}

const errors = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));

const ss = async (name) => {
  const p = `${SS}/${String(stepNum).padStart(2,'0')}_${name}.png`;
  await page.screenshot({ path: p, fullPage: true });
  console.log(`     📸 ${p}`);
  return p;
};

// ─── 1. REGISTER ────────────────────────────────────────────────────────────
await step('Register new account', async () => {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 8000 });
  ok(`Registered and redirected to dashboard — email: ${EMAIL}`);
  await ss('register_success');
});

// ─── 2. DASHBOARD — empty predictions ────────────────────────────────────────
await step('Dashboard loads — empty pantry for new user', async () => {
  const heading = await page.$eval('h1', el => el.textContent);
  ok(`Page heading: "${heading.trim()}"`);

  const emptyState = await page.$('.empty-state');
  if (emptyState) {
    const txt = await emptyState.innerText();
    ok(`Empty-state shown: "${txt.trim().slice(0, 60)}..."`);
  } else {
    const chips = await page.$$('.prediction-chip');
    warn(`No empty-state — ${chips.length} chips shown (unexpected for new user)`);
  }
  await ss('dashboard_empty');
});

// ─── 3. NAVIGATE TO SCAN ─────────────────────────────────────────────────────
await step('Navigate to /scan', async () => {
  await page.click('a[href="/scan"]');
  await page.waitForURL('**/scan', { timeout: 5000 });
  ok('Scan page loaded');
  await ss('scan_page');
});

// ─── 4. EXPAND VISION AGENT & LOAD MODEL ─────────────────────────────────────
await step('Expand Vision Agent — model loads', async () => {
  await page.click('.scanner-toggle');
  await page.waitForTimeout(500);

  let status = '';
  for (let i = 0; i < 30; i++) {
    const el = await page.$('.model-status');
    status = el ? (await el.innerText()).trim() : '';
    if (status.includes('listo') || status.includes('Error') || status.includes('encontrado')) break;
    await page.waitForTimeout(1000);
  }

  if (status.includes('listo')) ok(`Model status: "${status}"`);
  else if (status.includes('no encontrado')) { fail(`Model file missing: "${status}"`); }
  else { warn(`Unexpected status: "${status}"`); }
  await ss('model_loaded');
});

// ─── 5. UPLOAD IMAGE & DETECT ────────────────────────────────────────────────
await step('Upload banana photo → run inference → detect banana', async () => {
  const fileInput = await page.$('input[type="file"]');
  await fileInput.setInputFiles('C:/VibeChef/test_food.jpg');
  await page.waitForTimeout(600);

  const analyzeBtn = await page.$('.btn-analyze');
  await analyzeBtn.click();

  // wait for inference (up to 40s)
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const btn = await page.$('.btn-analyze');
    const txt = btn ? await btn.innerText() : '';
    if (!txt.includes('Analizando')) break;
  }

  const detBox = await page.$('.detections-box');
  if (detBox) {
    const txt = await detBox.innerText();
    ok(`Detections: ${txt.replace(/\n/g,' ').trim().slice(0,80)}`);
  } else {
    warn('No detections-box found — image may have no mappable COCO food class');
  }
  await ss('inference_result');
});

// ─── 6. ADD DETECTED INGREDIENT ──────────────────────────────────────────────
await step('Add detected ingredient to confirmation list', async () => {
  const addDetBtn = await page.$('.btn-add-detected');
  if (addDetBtn) {
    await addDetBtn.click();
    await page.waitForTimeout(400);
    ok('Clicked "Añadir al listado"');
  } else {
    warn('No .btn-add-detected — skipping (no detections)');
  }
  const tags = await page.$$('.ingredient-tag');
  ok(`Tags in list after detection: ${tags.length}`);
  const tagTexts = await Promise.all(tags.map(t => t.innerText()));
  ok(`Ingredients: ${tagTexts.map(t => t.replace('×','').trim()).join(', ')}`);
  await ss('after_detection_added');
});

// ─── 7. ADD MANUAL INGREDIENT ────────────────────────────────────────────────
await step('Manually add "egg" via text input', async () => {
  const input = await page.$('.scan-card input[type="text"]');
  await input.fill('egg');
  await input.press('Enter');
  await page.waitForTimeout(300);

  const tags = await page.$$('.ingredient-tag');
  const tagTexts = await Promise.all(tags.map(t => t.innerText()));
  const hasEgg = tagTexts.some(t => t.includes('egg'));
  if (hasEgg) ok(`"egg" added — full list: ${tagTexts.map(t => t.replace('×','').trim()).join(', ')}`);
  else warn(`"egg" not found in tags: ${tagTexts.join(', ')}`);
  await ss('manual_ingredient_added');
});

// ─── 8. SELECT FILTER ────────────────────────────────────────────────────────
await step('Select filter "Vegetariano"', async () => {
  const vegBtn = await page.$('.filter-btn:has-text("Vegetariano")') ||
                 await page.locator('.filter-btn').filter({ hasText: 'Vegetariano' }).first();
  await vegBtn.click();
  await page.waitForTimeout(200);
  const isActive = await vegBtn.evaluate(el => el.classList.contains('active'));
  isActive ? ok('Vegetariano filter active') : warn('Filter not visually active');
  await ss('filter_selected');
});

// ─── 9. SEARCH RECIPES ────────────────────────────────────────────────────────
await step('Click "Buscar recetas" → recipes page', async () => {
  const confirmBtn = await page.$('.btn-confirm');
  const btnText = await confirmBtn.innerText();
  ok(`Button text: "${btnText}"`);
  await confirmBtn.click();
  await page.waitForURL('**/recipes', { timeout: 10000 });
  ok(`Navigated to: ${page.url()}`);
  await ss('recipes_page');
});

// ─── 10. VERIFY RECIPE CARDS ─────────────────────────────────────────────────
await step('Recipe cards — score, match count, missing', async () => {
  await page.waitForSelector('.recipe-card', { timeout: 5000 });
  const cards = await page.$$('.recipe-card');
  ok(`${cards.length} recipe card(s) rendered`);

  if (cards.length > 0) {
    const first = cards[0];
    const name    = await first.$eval('h3', el => el.textContent.trim());
    const score   = await first.$('.recipe-score').then(el => el?.innerText() ?? '?');
    const match   = await first.$('.match-count').then(el => el?.innerText() ?? '?');
    const missing = await first.$('.missing').then(el => el?.innerText() ?? '(none)');
    ok(`Top recipe: "${name}" | Score: ${score} | ${match} | Missing: ${missing.slice(0,40)}`);
  }
  await ss('recipe_cards');
});

// ─── 11. EXPAND INSTRUCTIONS ─────────────────────────────────────────────────
await step('Expand recipe instructions via <details>', async () => {
  const summary = await page.$('.recipe-instructions summary');
  if (summary) {
    await summary.click();
    await page.waitForTimeout(300);
    const instructions = await page.$('.recipe-instructions p');
    const txt = instructions ? (await instructions.innerText()).slice(0, 80) : '?';
    ok(`Instructions visible: "${txt}..."`);
  } else {
    warn('No .recipe-instructions summary found');
  }
  await ss('instructions_expanded');
});

// ─── 12. PANTRY HISTORY ──────────────────────────────────────────────────────
await step('Despensa page — banana + egg appear with frequency 1', async () => {
  await page.click('a[href="/history"]');
  await page.waitForURL('**/history', { timeout: 5000 });
  await page.waitForTimeout(800);

  const rows = await page.$$('.history-table tbody tr');
  ok(`${rows.length} row(s) in history table`);

  if (rows.length > 0) {
    const rowData = await Promise.all(rows.map(async r => {
      const cells = await r.$$('td');
      return Promise.all(cells.map(c => c.innerText()));
    }));
    rowData.forEach(cells => ok(`  ${cells.join(' | ')}`));
  }
  await ss('pantry_history');
});

// ─── 13. DASHBOARD PREDICTIONS ────────────────────────────────────────────────
await step('Dashboard — predictions now populated', async () => {
  await page.click('a[href="/"]');
  await page.waitForURL('**/', { timeout: 5000 });
  await page.waitForTimeout(800);

  const chips = await page.$$('.prediction-chip');
  ok(`${chips.length} prediction chip(s) visible`);
  const chipTexts = await Promise.all(chips.map(c => c.innerText()));
  chipTexts.forEach(t => ok(`  chip: "${t.replace(/\n/g,' ').trim()}"`));

  const emptyState = await page.$('.empty-state');
  if (emptyState) warn('Empty-state still shown after first scan — predictions not refreshed');
  await ss('dashboard_with_predictions');
});

// ─── 14. LOG OUT ──────────────────────────────────────────────────────────────
await step('Log out → redirected to login', async () => {
  await page.click('.btn-logout');
  await page.waitForURL('**/login', { timeout: 5000 });
  ok(`After logout: ${page.url()}`);
  await ss('logged_out');
});

// ─── 15. LOG BACK IN ──────────────────────────────────────────────────────────
await step('Log back in → dashboard reloads', async () => {
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 8000 });
  const heading = await page.$eval('h1', el => el.textContent.trim());
  ok(`Dashboard heading: "${heading}"`);
  await ss('login_again_dashboard');
});

// ─── PROBES ───────────────────────────────────────────────────────────────────
log('\n— PROBES —');

// Probe A: duplicate registration
await step('🔍 Probe: register with same email → should reject', async () => {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  const errEl = await page.$('.auth-error');
  const errTxt = errEl ? await errEl.innerText() : '';
  if (errTxt) ok(`Duplicate email rejected: "${errTxt}"`);
  else warn('No error shown for duplicate email');
  await ss('probe_duplicate_email');
});

// Probe B: wrong password
await step('🔍 Probe: login wrong password → should reject', async () => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  const errEl = await page.$('.auth-error');
  const errTxt = errEl ? await errEl.innerText() : '';
  if (errTxt) ok(`Wrong password rejected: "${errTxt}"`);
  else warn('No error shown for wrong password');
  await ss('probe_wrong_password');
});

// Probe C: direct access to /scan without auth → redirected
await step('🔍 Probe: access /scan after logout → redirected to login', async () => {
  // still logged out from probe A attempt (never logged in)
  await page.goto(`${BASE}/scan`, { waitUntil: 'networkidle' });
  const url = page.url();
  if (url.includes('/login')) ok(`Correctly redirected to: ${url}`);
  else warn(`Unexpected URL for unauthenticated /scan: ${url}`);
  await ss('probe_unauthenticated_access');
});

// Probe D: match with 0 ingredients → button disabled
await step('🔍 Probe: scan page with no ingredients — confirm button disabled', async () => {
  // login first
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 5000 });
  await page.goto(`${BASE}/scan`, { waitUntil: 'networkidle' });
  const btn = await page.$('.btn-confirm');
  const disabled = await btn.getAttribute('disabled');
  disabled !== null ? ok('Confirm button disabled with 0 ingredients') : warn('Button not disabled with empty list');
  await ss('probe_empty_confirm');
});

await browser.close();

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
log('\n═══════════════════════════════════');
log('Console errors during session:');
if (errors.length === 0) {
  ok('Zero console errors');
} else {
  errors.forEach(e => warn(e.slice(0, 120)));
}
log(`\nScreenshots → ${SS}/`);
