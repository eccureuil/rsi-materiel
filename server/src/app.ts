import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { verifierConnexionDB } from './config/database.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/authRoutes.js';

const app: Express = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
// Les routes des modules (matériels, pannes, stock) seront branchées ici.

app.use(notFoundHandler);
app.use(errorHandler);

async function demarrer(): Promise<void> {
  await verifierConnexionDB();
  app.listen(env.PORT, () => {
    console.log(`Serveur RSI démarré sur http://localhost:${env.PORT}`);
  });
}

demarrer().catch((err: Error) => {
  console.error('Échec du démarrage :', err.message);
  process.exit(1);
});

export default app;