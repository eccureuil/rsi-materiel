// Politique de mot de passe identique au backend :
// - 8 caracteres minimum
// - au moins une lettre
// - au moins un chiffre

export interface ResultatValidationMdp {
  valide: boolean;
  erreurs: string[];
}

export function validerMotDePasse(mdp: string): ResultatValidationMdp {
  const erreurs: string[] = [];
  if (mdp.length < 8) erreurs.push('Au moins 8 caractères.');
  if (!/[A-Za-z]/.test(mdp)) erreurs.push('Au moins une lettre.');
  if (!/\d/.test(mdp)) erreurs.push('Au moins un chiffre.');
  return { valide: erreurs.length === 0, erreurs };
}