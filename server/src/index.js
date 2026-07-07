import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import feedsRouter from './routes/feeds.js';
import categoriesRouter from './routes/categories.js';
import articleContentRouter from './routes/articleContent.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
  // Firebase Hosting always provides two domains
  'https://pulse-news-17d37.web.app',
  'https://pulse-news-17d37.firebaseapp.com',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Render health checks) and known origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());

app.use('/api/feeds', feedsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/article-content', articleContentRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
