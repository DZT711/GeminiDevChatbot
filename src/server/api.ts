import express from 'express';
import { router as chatRouter } from './controllers/ChatController.js';
import { router as authRouter } from './controllers/AuthController.js';
import { router as adminRouter } from './controllers/AdminController.js';
import { router as knowledgeRouter } from './controllers/KnowledgeController.js';
import { router as modelRouter } from './controllers/ModelController.js';
import { router as userRouter } from './controllers/UserController.js';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '50mb' }));
apiRouter.use(express.urlencoded({ limit: '50mb', extended: true }));

apiRouter.use(chatRouter);
apiRouter.use(authRouter);
apiRouter.use(adminRouter);
apiRouter.use(knowledgeRouter);
apiRouter.use(modelRouter);
apiRouter.use(userRouter);
