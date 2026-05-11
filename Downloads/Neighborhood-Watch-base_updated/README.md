# Sentry — Community Safety Intelligence

Express + Handlebars web app for neighborhood watch / community safety reporting.

## Setup

```bash
npm install
npm start
```

Visit http://localhost:3000

For auto-reload during development:

```bash
npm run dev
```

## Project Structure

```
sentry/
├── app.js                       Express server + routes
├── package.json
├── views/
│   ├── layouts/
│   │   └── main.hbs             Base layout (head, nav, footer, body slot)
│   ├── partials/
│   │   ├── nav.hbs              Top navigation
│   │   ├── footer.hbs
│   │   └── incident-modal.hbs   Click-a-pin modal (used on home)
│   ├── home.hbs                 Landing page
│   ├── register.hbs             ← Replace with your registration form
│   └── login.hbs                ← Replace with your sign-in form
└── public/
    ├── css/styles.css           All styles
    └── js/home.js               Modal click handlers for home page
```

## Adding a new page

1. Create `views/your-page.hbs` with just the page content (no `<html>` / `<head>`).
2. Add a route in `app.js`:
   ```js
   app.get('/your-page', (req, res) => {
     res.render('your-page', { title: 'Your Page' });
   });
   ```
3. The `main.hbs` layout wraps it automatically with the nav, fonts, and styles.

## Notes

- The home page modal data is currently hardcoded in `public/js/home.js` for the demo. When you wire up real incidents, replace the `incidents` array with data fetched from your backend.
- The map is a stylized SVG placeholder. Swap in Google Maps when ready — the pin click handlers are already in place via `data-incident` attributes.
- Routes use `/register.html` and `/login.html` to match the existing nav links. Change the route paths and `href` values together if you prefer something else.
