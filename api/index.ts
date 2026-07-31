import express from 'express';
import { apiRouter } from '../src/server/api';

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', apiRouter);

export default app;
