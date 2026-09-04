const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('accepts a valid contact request and does not expose stored data', async () => {
  const calls = [], mail = [];
  const app = createApp({
    pool: { query: async (...args) => calls.push(args) },
    transporter: { sendMail: async (message) => mail.push(message) }, senderEmail: 'mailer@example.com'
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', service: 'survey', message: 'Please call me.' }) });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(calls.length, 1);
    assert.equal(mail[0].to, 'geopointdrillingcompany@gmail.com');
  });
});

test('rejects invalid and honeypot submissions', async () => {
  const app = createApp({ transporter: { sendMail: async () => undefined } });
  await withServer(app, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada', email: 'bad-email', service: 'survey', message: 'Hello' }) });
    assert.equal(invalid.status, 400);
    const bot = await fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', service: 'survey', message: 'Hello', website: 'bot.example' }) });
    assert.equal(bot.status, 400);
  });
});

test('health reports an unavailable database without leaking details', async () => {
  const app = createApp({ pool: { query: async () => { throw new Error('connection refused'); } } });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'degraded', database: 'unavailable' });
  });
});

test('still sends email when database storage is temporarily unavailable', async () => {
  let mailed = false;
  const app = createApp({
    pool: { query: async () => { throw new Error('database unavailable'); } },
    transporter: { sendMail: async () => { mailed = true; } }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', service: 'survey', message: 'Please call me.' }) });
    assert.equal(response.status, 201);
    assert.equal(mailed, true);
  });
});

test('sends each submitted review to the designated inbox before storing it', async () => {
  const mail = [];
  const review = { id: 1, name: 'Ada', rating: 5, comment: 'Excellent service', created_at: '2026-09-04T00:00:00.000Z' };
  const app = createApp({
    pool: { query: async () => ({ rows: [review] }) },
    transporter: { sendMail: async (message) => mail.push(message) }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada', rating: 5, comment: 'Excellent service' }) });
    assert.equal(response.status, 201);
    assert.equal(mail.length, 1);
    assert.equal(mail[0].to, 'geopointdrillingcompany@gmail.com');
  });
});
