// 'AAAA-MM-JJ' -> 'JJ/MM/AAAA' (sans passer par Date : pas de décalage de fuseau)
export const formatJour = (iso?: string | null): string => {
  const [annee, mois, jour] = (iso || '').split('-');
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : '—';
};

// Première lettre en majuscule (avatars)
export const initiale = (texte?: string): string => (texte?.trim().charAt(0) || '?').toUpperCase();
// Date relative : « à l'instant », « il y a 5 min », « il y a 2 h », « il y a 3 j », sinon JJ/MM/AAAA
export const tempsRelatif = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const secondes = Math.round((Date.now() - date.getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;
  return formatJour(iso.slice(0, 10));
};

// Titre court d'une notification selon son type
export const titreNotification = (type: string): string => {
  switch (type) {
    case 'tache_affectee':
      return 'Nouvelle tâche';

    case 'tache_statut_modifie':
      return 'Statut modifié';

    case 'membre_ajoute':
      return 'Nouveau projet';

    case 'membre_retire':
      return "Retrait d'un projet";
      
    default:
      return 'Notification';
  }
};
// « Aujourd'hui, 09:00 » / « Hier, 14:20 » / « 5 oct. 2026, 18:45 »
export const dateHeure = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const maintenant = new Date();
  const hier = new Date();
  hier.setDate(maintenant.getDate() - 1);

  if (date.toDateString() === maintenant.toDateString()) return `Aujourd'hui, ${heure}`;
  if (date.toDateString() === hier.toDateString()) return `Hier, ${heure}`;

  const jour = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${jour}, ${heure}`;
};

// Nombre de jours écoulés depuis une échéance (0 si elle n'est pas dépassée)
export const joursDeRetard = (echeance?: string | null): number => {
  if (!echeance) return 0;
  const fin = new Date(`${echeance.slice(0, 10)}T00:00:00`);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((aujourdhui.getTime() - fin.getTime()) / 86_400_000));
};