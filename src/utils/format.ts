// 'AAAA-MM-JJ' -> 'JJ/MM/AAAA' (sans passer par Date : pas de décalage de fuseau)
export const formatJour = (iso?: string | null): string => {
  const [annee, mois, jour] = (iso || '').split('-');
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : '—';
};

// Première lettre en majuscule (avatars)
export const initiale = (texte?: string): string => (texte?.trim().charAt(0) || '?').toUpperCase();