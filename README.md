# Geopoint Drilling website

Marketing website and contact-form service for Geopoint Drilling Company Nigeria Ltd.

## Run locally

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env` and set the real database, SMTP, and permitted production domain values. All contact messages and website reviews are delivered to `geopointdrillingcompany@gmail.com`.
3. Run `npm install`, then `npm start`.
4. Visit `http://localhost:3000`. `GET /health` confirms database availability.

Run the automated contact-service tests with `npm test`.

## Production checklist

- Deploy behind HTTPS and set `ALLOWED_ORIGINS` to the exact public site URLs.
- Confirm that a real contact form submission appears in PostgreSQL and reaches the designated inbox.
- Configure database backups and a retention/deletion policy for contact messages.
- Keep `.env` out of source control; rotate SMTP/database credentials if they were ever committed or shared.
- Use a managed process host or process manager to restart `npm start` after failures.
- Replace the descriptive service panels with approved project photographs when supplied by the business.

## Deploy on Render from GitHub

1. Create a GitHub repository, commit this project (without `.env`), and push it to GitHub.
2. In Render, create a PostgreSQL database, then create a **Web Service** connected to that repository.
3. Use build command `npm install` and start command `npm start`. Render supplies `PORT` automatically.
4. In the Web Service's Environment settings, add `DATABASE_URL` (from the Render database's Internal Database URL), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `ALLOWED_ORIGINS` (the final Render URL, plus any custom-domain URL). Do not add `EMAIL_TO`; the recipient is fixed to `geopointdrillingcompany@gmail.com`.
5. Deploy, open `/health` to confirm the database status is `ok`, then submit a contact message and a review to confirm both reach the business inbox.

## Privacy

The form collects name, email address, selected service, and message solely to respond to enquiries. Publish the final retention period and contact responsible for data requests before launch.
