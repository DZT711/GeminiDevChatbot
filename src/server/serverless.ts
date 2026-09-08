import express from 'express';
import { apiRouter } from './api.js';

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount at both /api and / so all endpoints match whether Vercel preserves or strips the /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
