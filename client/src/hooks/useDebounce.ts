import { useEffect, useState } from 'react';

// Retourne la valeur `valeur` apres `delai` ms sans changement.
// Utile pour les champs de recherche : evite un appel API par caractere.
export function useDebounce<T>(valeur: T, delai = 300): T {
  const [debouncee, setDebouncee] = useState<T>(valeur);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncee(valeur), delai);
    return () => window.clearTimeout(id);
  }, [valeur, delai]);

  return debouncee;
}