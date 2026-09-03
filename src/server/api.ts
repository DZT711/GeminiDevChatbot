import express from 'express';
import { appendSystemLog } from './logInterceptor.js';
import { router as chatRouter } from './controllers/ChatController.js';
import { router as authRouter } from './controllers/AuthController.js';
import { router as adminRouter } from './controllers/AdminController.js';
import { router as knowledgeRouter } from './controllers/KnowledgeController.js';
import { router as modelRouter } from './controllers/ModelController.js';
import { router as userRouter } from './controllers/UserController.js';
import { router as workspaceRouter } from './controllers/WorkspaceController.js';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '50mb' }));
apiRouter.use(express.urlencoded({ limit: '50mb', extended: true }));

// Admin logging middleware for every incoming API request
apiRouter.use((req, res, next) => {
  if (req.path === '/admin/logs' || req.path === '/health') {
    return next();
  }
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusCategory = statusCode >= 500 ? 'HTTP_5XX' : statusCode >= 400 ? 'HTTP_4XX' : 'HTTP_OK';
    appendSystemLog(statusCategory, `${method} ${url} -> ${statusCode} (${duration}ms)`);
  });
  
  next();
});

apiRouter.use(chatRouter);
apiRouter.use(authRouter);
apiRouter.use(adminRouter);
apiRouter.use(knowledgeRouter);
apiRouter.use(modelRouter);
apiRouter.use(userRouter);
apiRouter.use(workspaceRouter);

