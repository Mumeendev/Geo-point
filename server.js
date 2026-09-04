require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');

const SERVICES = new Set(['drilling', 'survey', 'consultancy', 'solar', 'other']);
const WINDOW_MS = 15 * 60 * 1000;

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function rateLimiter() {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const recent = (attempts.get(key) || []).filter((time) => now - time < WINDOW_MS);
    if (recent.length >= 5) return res.status(429).json({ error: 'Too many messages. Please try again in 15 minutes.' });
    recent.push(now); attempts.set(key, recent); next();
  };
}

const BUSINESS_EMAIL = 'geopointdrillingcompany@gmail.com';

function createApp({ pool = null, transporter = null, senderEmail = '', allowedOrigins = [] } = {}) {
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
  app.get('/health', async (req, res) => {
    if (!pool) return res.status(503).json({ status: 'degraded', database: 'not configured' });
    try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'degraded', database: 'unavailable' }); }
  });
  app.post('/api/contact', rateLimiter(), async (req, res) => {
    const name = String(req.body.name || '').trim(), email = String(req.body.email || '').trim(), service = String(req.body.service || '').trim(), message = String(req.body.message || '').trim(), website = String(req.body.website || '').trim();
    if (website) return res.status(400).json({ error: 'Unable to submit this message.' });
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required.' });
    if (name.length > 100 || email.length > 254 || message.length > 5000) return res.status(400).json({ error: 'Please shorten your message and try again.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please provide a valid email address.' });
    if (!SERVICES.has(service)) return res.status(400).json({ error: 'Please select a valid service.' });
    if (!transporter) return res.status(503).json({ error: 'Contact form email is not configured. Please try again later.' });
    if (pool) {
      try {
        await pool.query('INSERT INTO messages (name, email, service, message) VALUES ($1, $2, $3, $4)', [name, email, service, message]);
      } catch (error) { console.error('Contact message could not be stored:', error.message); }
    }
    let mailed = false;
    try {
      await transporter.sendMail({ from: `"GeoPoint Website" <${senderEmail || 'no-reply@geopoint.com'}>`, to: BUSINESS_EMAIL, replyTo: email, subject: `New website message from ${name}`, text: `Name: ${name}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`, html: `<h3>New Contact Form Submission</h3><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Service:</strong> ${escapeHtml(service)}</p><p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` });
      mailed = true;
    } catch (error) { console.error('Contact email could not be sent:', error.message); }
    if (!mailed) return res.status(503).json({ error: 'We could not send your message right now. Please call or email us directly.' });
    res.status(201).json({ success: true });
  });
  app.get('/api/feedback', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Feedback is not configured.' });
    try {
      const result = await pool.query('SELECT id, name, rating, comment, created_at FROM feedback ORDER BY created_at DESC LIMIT 30');
      res.json(result.rows);
    } catch (error) {
      console.error('Feedback could not be retrieved:', error.message);
      res.status(503).json({ error: 'Feedback is temporarily unavailable.' });
    }
  });
  app.post('/api/feedback', rateLimiter(), async (req, res) => {
    const name = String(req.body.name || '').trim();
    const comment = String(req.body.comment || '').trim();
    const rating = Number(req.body.rating);
    if (!name || !comment || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Name, rating, and comment are required.' });
    if (name.length > 100 || comment.length > 1000) return res.status(400).json({ error: 'Please shorten your feedback and try again.' });
    if (!pool || !transporter) return res.status(503).json({ error: 'Feedback is not configured. Please try again later.' });
    try {
      await transporter.sendMail({ from: `"GeoPoint Website" <${senderEmail || 'no-reply@geopoint.com'}>`, to: BUSINESS_EMAIL, subject: `New website review from ${name}`, text: `Name: ${name}\nRating: ${rating}/5\n\nReview:\n${comment}`, html: `<h3>New Website Review</h3><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Rating:</strong> ${rating}/5</p><p><strong>Review:</strong><br>${escapeHtml(comment).replace(/\n/g, '<br>')}</p>` });
      const result = await pool.query('INSERT INTO feedback (name, rating, comment) VALUES ($1, $2, $3) RETURNING id, name, rating, comment, created_at', [name, rating, comment]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Feedback could not be stored:', error.message);
      res.status(503).json({ error: 'We could not post your feedback right now.' });
    }
  });
  return app;
}

async function start() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ...(/localhost|127\.0\.0\.1/.test(databaseUrl) ? {} : { ssl: { rejectUnauthorized: false } }) }) : null;
  const smtpReady = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every((key) => Boolean(process.env[key]));
  const transporter = smtpReady ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
  if (pool) try {
    await pool.query('CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, service TEXT, message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('CREATE TABLE IF NOT EXISTS feedback (id SERIAL PRIMARY KEY, name TEXT NOT NULL, rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5), comment TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    console.log('Database initialized');
  } catch (error) { console.error('Database initialization failed; email delivery remains available:', error.message); }
  const port = Number(process.env.PORT) || 3000;
  createApp({ pool, transporter, senderEmail: process.env.SMTP_USER, allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()) }).listen(port, '0.0.0.0', () => console.log(`Server running at http://localhost:${port}`));
}
if (require.main === module) start();
module.exports = { createApp, escapeHtml };
