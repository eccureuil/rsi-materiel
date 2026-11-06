import type { Request, Response } from 'express';
import {
  changerMotDePasseSchema,
  createUtilisateurSchema,
  listUtilisateursQuerySchema,
  matriculeParamSchema,
  reinitialiserMotDePasseSchema,
  statutCompteSchema,
  updateUtilisateurSchema,
} from '../models/utilisateur.js';
import type { UtilisateurService } from '../services/UtilisateurService.js';
import { getAuthUser } from '../utils/requestUser.js';

export class UtilisateurController {
  constructor(private readonly service: UtilisateurService) {}

  lister = async (req: Request, res: Response): Promise<void> => {
    const filters = listUtilisateursQuerySchema.parse(req.query);
    res.json(await this.service.lister(filters));
  };

  obtenir = async (req: Request, res: Response): Promise<void> => {
    const { matricule } = matriculeParamSchema.parse(req.params);
    res.json({ utilisateur: await this.service.obtenir(matricule) });
  };

  creer = async (req: Request, res: Response): Promise<void> => {
    const dto = createUtilisateurSchema.parse(req.body);
    res.status(201).json({ utilisateur: await this.service.creer(dto) });
  };

  modifier = async (req: Request, res: Response): Promise<void> => {
    const { matricule } = matriculeParamSchema.parse(req.params);
    const dto = updateUtilisateurSchema.parse(req.body);
    res.json({ utilisateur: await this.service.modifier(matricule, dto) });
  };

  changerStatut = async (req: Request, res: Response): Promise<void> => {
    const { matricule } = matriculeParamSchema.parse(req.params);
    const { statut_compte } = statutCompteSchema.parse(req.body);
    const utilisateur = await this.service.changerStatut(
      matricule,
      statut_compte,
      getAuthUser(req).matricule,
    );
    res.json({ utilisateur });
  };

  reinitialiserMotDePasse = async (req: Request, res: Response): Promise<void> => {
    const { matricule } = matriculeParamSchema.parse(req.params);
    const { nouveau_mot_de_passe } = reinitialiserMotDePasseSchema.parse(req.body);
    await this.service.reinitialiserMotDePasse(matricule, nouveau_mot_de_passe);
    res.status(204).send();
  };

  changerSonMotDePasse = async (req: Request, res: Response): Promise<void> => {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = changerMotDePasseSchema.parse(req.body);
    await this.service.changerSonMotDePasse(
      getAuthUser(req).matricule,
      ancien_mot_de_passe,
      nouveau_mot_de_passe,
    );
    res.status(204).send();
  };
}