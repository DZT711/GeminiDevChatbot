import express from 'express';
import { apiRouter } from '../src/api';

const app = express();
app.use('/api', apiRouter);
app.use('/', apiRouter); // fallback for vercel rewrites

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    if (res.status) {
       res.status(500).json({ error: 'Initialization error: ' + err.message });
    }
  }
}
