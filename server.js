const express = require('express');
const path = require('path');
require('dotenv').config();

function createApp({ allowedOrigins = [] } = {}) {
  const app = express();
  const origins = new Set(allowedOrigins.filter(Boolean));
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'Content-Security-Policy': "default-src 'self'; img-src 'self'; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'", 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), geolocation=(), microphone=()' });
    const origin = req.get('origin');
    if (origin && origins.has(origin)) res.set('Access-Control-Allow-Origin', origin);
    next();
  });
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname), { dotfiles: 'deny', index: 'index.html' }));
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  return app;
}

async function start() {
  const port = Number(process.env.PORT) || 3000;
  createApp({ allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()) }).listen(port, '0.0.0.0', () => console.log(`Server running at http://localhost:${port}`));
}
if (require.main === module) start();
module.exports = { createApp };