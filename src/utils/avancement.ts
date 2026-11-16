/**
 * Calculs d'avancement du tableau de bord (fonctions pures, sans React ni appel réseau).
 *
 * Deux sources de données :
 *  - les compteurs que `GET /projets` renvoie déjà pour chaque projet (répartition, taux) ;
 *  - la liste des tâches, uniquement pour la courbe mensuelle (besoin des échéances).
 */
import { Projet, Tache } from '../types/sgp';

// --- Statuts affichés dans les graphiques ---

export type CleStatut = 'termine' | 'enCours' | 'enRetard' | 'annule';

export interface StyleStatut {
  label: string;
  fond: string; // barres
  trait: string; // arcs du donut (SVG)
  texte: string;
}

// Classes écrites en toutes lettres pour que Tailwind les détecte
export const STATUTS: Record<CleStatut, StyleStatut> = {
  termine: { label: 'Terminées', fond: 'bg-emerald-600', trait: 'stroke-emerald-600', texte: 'text-emerald-700' },
  enCours: {
    label: 'En cours',
    fond: 'bg-brand-700',
    trait: 'stroke-brand-700',
    texte: 'text-brand-800',
  },
  enRetard: {
    label: 'En retard',
    fond: 'bg-rose-600',
    trait: 'stroke-rose-600',
    texte: 'text-rose-700',
  },
  annule: { label: 'Annulées', fond: 'bg-slate-300', trait: 'stroke-slate-300', texte: 'text-slate-600' },
};

// --- Répartition des tâches d'un projet (ou de plusieurs) ---

export interface Repartition {
  termine: number;
  enCours: number; // en cours, échéance non dépassée
  enRetard: number; // en cours, échéance dépassée
  annule: number;
  actives: number; // tâches non annulées : base du taux d'avancement
  taux: number; // % de tâches actives terminées (même formule que l'API)
}

export const pourcentage = (n: number, total: number): number =>
  total > 0 ? Math.round((n / total) * 100) : 0;

const construire = (termine: number, enCours: number, enRetard: number, annule: number): Repartition => {
  const actives = termine + enCours + enRetard;
  return { termine, enCours, enRetard, annule, actives, taux: pourcentage(termine, actives) };
};

// L'API compte les tâches « en retard » parmi les tâches « en cours » : on les sépare ici
export function repartitionProjet(projet: Projet): Repartition {
  const ouvertes = projet.taches_en_cours ?? 0;
  const enRetard = Math.min(projet.taches_en_retard ?? 0, ouvertes);

  return construire(projet.taches_terminees ?? 0, ouvertes - enRetard, enRetard, projet.taches_annulees ?? 0);
}

export function repartitionGlobale(projets: Projet[]): Repartition {
  const somme = projets.map(repartitionProjet).reduce(
    (cumul, r) => ({
      termine: cumul.termine + r.termine,
      enCours: cumul.enCours + r.enCours,
      enRetard: cumul.enRetard + r.enRetard,
      annule: cumul.annule + r.annule,
    }),
    { termine: 0, enCours: 0, enRetard: 0, annule: 0 }
  );

  return construire(somme.termine, somme.enCours, somme.enRetard, somme.annule);
}

// --- Progression mensuelle ---

export interface MoisAvancement {
  cle: string; // 'AAAA-MM'
  label: string; // 'Nov 26'
  planifiees: number; // tâches dont l'échéance tombe ce mois
  realisees: number; // parmi elles, celles qui sont terminées
  tauxCumule: number; // % réalisées / planifiées depuis le premier mois
}

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export const libelleMois = (cle: string): string => {
  const [annee, mois] = cle.split('-');
  return `${MOIS_COURTS[Number(mois) - 1] ?? mois} ${annee.slice(2)}`;
};

// Tous les mois de `debut` à `fin` inclus, sans trou ('AAAA-MM')
function moisEntre(debut: string, fin: string): string[] {
  const [anneeFin, moisFin] = fin.split('-').map(Number);
  let [annee, mois] = debut.split('-').map(Number);
  const cles: string[] = [];

  while (annee < anneeFin || (annee === anneeFin && mois <= moisFin)) {
    cles.push(`${annee}-${String(mois).padStart(2, '0')}`);
    mois += 1;
    if (mois > 12) {
      mois = 1;
      annee += 1;
    }
  }
  return cles;
}

/**
 * Regroupe les tâches par mois d'échéance. Les tâches annulées sont ignorées.
 * Le cumul est calculé sur toute la période, puis on garde les `maxMois` derniers mois.
 *
 * On part de l'échéance (toujours renseignée) plutôt que de `updated_at` : cette date change
 * à chaque modification de la tâche, elle ne dit donc pas quand elle a été clôturée.
 */
export function serieMensuelle(taches: Tache[], maxMois = 12): MoisAvancement[] {
  const parMois = new Map<string, { planifiees: number; realisees: number }>();

  for (const t of taches) {
    if (t.statut === 'annule' || !t.date_echeance) continue;
    const cle = t.date_echeance.slice(0, 7);
    const mois = parMois.get(cle) ?? { planifiees: 0, realisees: 0 };
    mois.planifiees += 1;
    if (t.statut === 'termine') mois.realisees += 1;
    parMois.set(cle, mois);
  }

  const cles = [...parMois.keys()].sort();
  if (cles.length === 0) return [];

  let planifieesCumul = 0;
  let realiseesCumul = 0;

  const serie = moisEntre(cles[0], cles[cles.length - 1]).map((cle) => {
    const { planifiees, realisees } = parMois.get(cle) ?? { planifiees: 0, realisees: 0 };
    planifieesCumul += planifiees;
    realiseesCumul += realisees;

    return {
      cle,
      label: libelleMois(cle),
      planifiees,
      realisees,
      tauxCumule: pourcentage(realiseesCumul, planifieesCumul),
    };
  });

  return serie.slice(-maxMois);
}
