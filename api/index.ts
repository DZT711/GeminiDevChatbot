import express from 'express';
import { apiRouter } from '../src/api';

const app = express();
app.use('/api', apiRouter);

export default app;
