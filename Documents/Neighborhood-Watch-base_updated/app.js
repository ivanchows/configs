import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbConnection } from './config/mongoConnection.js';
import constructorMethod from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Handlebars — support both .hbs and .handlebars extensions
const hbsConfig = {
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    eq: (a, b) => a === b,
    titleCase: (str) => {
      if (!str) return '';
      return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    },
    statusClass: (status) => {
      if (!status) return '';
      const s = status.toLowerCase();
      if (s === 'active') return 'badge-active';
      if (s === 'resolved') return 'badge-resolved';
      return 'badge-notified';
    }
  }
};
app.engine('handlebars', engine({ ...hbsConfig, extname: '.handlebars' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  name: 'SentrySession',
  secret: 'sentry_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

// Make logged-in user available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Connect to MongoDB then start server
dbConnection().then(() => {
  constructorMethod(app);
  app.listen(PORT, () => {
    console.log(`Sentry running at http://localhost:${PORT}`);
  });
}).catch((e) => {
  console.error('Failed to connect to MongoDB:', e);
  process.exit(1);
});
