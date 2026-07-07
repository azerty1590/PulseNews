import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import feedsRouter from './routes/feeds.js';
import categoriesRouter from './routes/categories.js';
import articleContentRouter from './routes/articleContent.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/feeds', feedsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/article-content', articleContentRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
