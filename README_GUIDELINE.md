# Platform Setup & Deployment Guideline

Thank you for acquiring the platform! This repository is designed to be easily deployed to most standard hosting environments.
All sensitive and configurable information has been abstracted to environment variables, making it secure and easy to white-label.

## 1. Initial Setup

1. **Extract the project files** on your workstation or upload them to your web server.
2. **Duplicate the environment template:**
   ```bash
   cp .env.example .env
   ```

## 2. Configuration (`.env`)

Open your new `.env` file and configure the variables:

- **App & SEO:** Customize `VITE_APP_NAME`, `VITE_SEO_TITLE`, and `VITE_SEO_DESCRIPTION` to rebrand the platform.
- **Contact Details:** Update `VITE_CONTACT_EMAIL`, `VITE_WHATSAPP_NUMBER`, and `VITE_GITHUB_URL` which are displayed in the UI.
- **APIs:** Provide your `VITE_API_KEY` (and optionally `VITE_OPENROUTER_API_KEY` for AI features).
- **SMTP (Contact Form):** 
  To receive messages from the contact page, provide your SMTP credentials (`SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`).
  *If using Gmail, generate an "App Password" to use as the `SMTP_PASSWORD`.*

## 3. Local Development

To test the platform locally on your machine:

```bash
npm install
npm run dev
```

Visit the displayed local URL (usually `http://localhost:5173`) in your browser.

## 4. Production Deployment

### Building the Frontend

Build the Vite application for production:

```bash
npm run build
```

This will generate a `dist/` directory containing all static assets, ready to be served.

### Hosting Notes

- **Static Hosting (Vercel, Netlify):** The frontend can be hosted statically. However, the contact form relies on a PHP script (`public/contact_mailer.php`).
- **Standard Shared Hosting (cPanel / Apache / Nginx with PHP):** 
  Upload the contents of the `dist/` directory to your public web root (`public_html` or `www`).
  The PHP backend for the contact form will automatically read your `.env` file from the root directory to configure the SMTP connection.
  Ensure your server routes all frontend requests to `index.html` (a standard `.htaccess` or Nginx rewrite rule for SPAs).

## 5. Verification Checklist

- [ ] UI reflects your custom App Name and SEO titles.
- [ ] Movies and TV Shows load correctly (API Key working).
- [ ] Contact form sends emails successfully to your provided email address.
- [ ] WhatsApp contact buttons link to your provided number.

Enjoy your new platform!
