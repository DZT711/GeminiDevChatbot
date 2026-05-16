import express from 'express';
import { apiRouter } from '../src/api';

const app = express();
app.use('/api', apiRouter);
app.use('/', apiRouter); // fallback for vercel rewrites

// Global error handler for Express
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Express Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('Handler Error:', err);
    res.status(500).json({ error: 'Initialization error: ' + err.message });
  }
}
