import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { verifierConnexionDB } from './config/database.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import affectationRoutes from './routes/affectationRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bonRoutes from './routes/bonRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import { historiqueGlobalRouter, historiqueMaterielRouter } from './routes/historiqueRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import interventionRoutes from './routes/interventionRoutes.js';
import localisationRoutes from './routes/localisationRoutes.js';
import materielRoutes from './routes/materielRoutes.js';
import pieceRoutes from './routes/pieceRoutes.js';
import profilRoutes from './routes/profilRoutes.js';
import utilisateurRoutes from './routes/utilisateurRoutes.js';

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
app.use('/api/profil', profilRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/localisations', localisationRoutes);
app.use('/api/historique', historiqueGlobalRouter);
app.use('/api/materiels', historiqueMaterielRouter); // doit précéder materielRoutes
app.use('/api/materiels', materielRoutes);
app.use('/api/affectations', affectationRoutes);
app.use('/api/bons', bonRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/pieces', pieceRoutes);
app.use('/api/exports', exportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function demarrer(): Promise<void> {
  await verifierConnexionDB();
  app.listen(env.PORT, env.HOST, () => {
    console.log(`Serveur RSI démarré sur http://${env.HOST}:${env.PORT}`);
  });
}

demarrer().catch((err: Error) => {
  console.error('Échec du démarrage :', err.message);
  process.exit(1);
});

export default app;