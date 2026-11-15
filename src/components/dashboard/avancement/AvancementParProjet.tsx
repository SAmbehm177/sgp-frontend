import React, { useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3 } from 'lucide-react';
import { Projet, RouteParams } from '../../../types/sgp';
import { ProjectStatusBadge } from '../../common/Badge';
import { formatJour } from '../../../utils/format';
import { CleStatut, Repartition, STATUTS, pourcentage, repartitionProjet } from '../../../utils/avancement';
import { SegmentedControl } from './SegmentedControl';

interface AvancementParProjetProps {
  projets: Projet[];
  onNavigate: (route: string, params?: RouteParams) => void;
}

type Mode = 'taux' | 'statut';
type FiltreStatut = 'all' | 'en_cours' | 'termine';

interface Ligne {
  projet: Projet;
  repartition: Repartition;
}

const MODES = [
  { id: 'taux', label: 'Taux (%)' },
  { id: 'statut', label: 'Par statut' },
] as const;

const FILTRES = [
  { id: 'all', label: 'Tous' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'termine', label: 'Terminés' },
] as const;

// Les tâches annulées n'entrent pas dans un taux ; elles n'apparaissent qu'en nombre
const STATUTS_TAUX: CleStatut[] = ['termine', 'enCours', 'enRetard'];
const STATUTS_NOMBRE: CleStatut[] = ['termine', 'enCours', 'enRetard', 'annule'];

// Axe des nombres : multiple de 4 pour des graduations entières
const axeMax = (valeurMax: number) => Math.max(4, Math.ceil(valeurMax / 4) * 4);
const graduations = (max: number) => [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(max * f));

const chefs = (projet: Projet) => (projet.chefs_noms?.length ? projet.chefs_noms.join(', ') : 'Sans chef');

// --- Repère commun (axe vertical, quadrillage, défilement horizontal) ---

interface RepereProps {
  max: number;
  suffixe: string;
  largeurMin: string;
  children: React.ReactNode;
}

const Repere: React.FC<RepereProps> = ({ max, suffixe, largeurMin, children }) => (
  <div className="mt-4 flex items-stretch gap-3">
    <div className="w-10 shrink-0 pt-6" aria-hidden="true">
      <div className="h-56 flex flex-col justify-between items-end pr-1 text-[10px] font-mono tabular-nums text-slate-400 select-none">
        {graduations(max).map((tick, i) => (
          <span key={i} className="leading-none -translate-y-1">
            {tick}
            {suffixe}
          </span>
        ))}
      </div>
    </div>

    <div className="flex-1 overflow-x-auto">
      <div className={`${largeurMin} relative pt-6`}>
        <div className="absolute inset-x-0 top-6 h-56 border-b border-slate-200 pointer-events-none">
          {[25, 50, 75, 100].map((pct) => (
            <div key={pct} style={{ bottom: `${pct}%` }} className="absolute inset-x-0 border-t border-dashed border-slate-200/90" />
          ))}
        </div>
        <div className="relative flex justify-around gap-4 px-2">{children}</div>
      </div>
    </div>
  </div>
);

// Valeur affichée au-dessus d'une barre
const Etiquette: React.FC<{ hauteur: number; children: React.ReactNode }> = ({ hauteur, children }) => (
  <span
    style={{ bottom: `calc(${hauteur}% + 6px)` }}
    className="absolute left-1/2 -translate-x-1/2 text-xs font-bold font-mono tabular-nums text-slate-900 leading-none pointer-events-none whitespace-nowrap"
  >
    {children}
  </span>
);

const Barre: React.FC<{ hauteur: number; vide: boolean; fond: string; survol: boolean }> = ({
  hauteur,
  vide,
  fond,
  survol,
}) => (
  <div
    style={{ height: `${hauteur}%`, minHeight: vide ? '2px' : '4px' }}
    className={`w-full rounded-t-md transition-all duration-200 ${vide ? 'bg-slate-200' : fond} ${survol ? 'brightness-110' : ''}`}
  />
);

const classeColonne = (survol: boolean) =>
  `flex-1 flex flex-col rounded-t-lg px-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand-700 ${
    survol ? 'bg-slate-50/80' : ''
  }`;

// --- Un seul projet : une barre par statut ---

const ProjetUnique: React.FC<{ ligne: Ligne; mode: Mode; onNavigate: AvancementParProjetProps['onNavigate'] }> = ({
  ligne,
  mode,
  onNavigate,
}) => {
  const [survol, setSurvol] = useState<CleStatut | null>(null);
  const { projet, repartition } = ligne;
  const { actives, taux } = repartition;
  const total = actives + repartition.annule;

  const cles = mode === 'taux' ? STATUTS_TAUX : STATUTS_NOMBRE;
  const max = mode === 'taux' ? 100 : axeMax(Math.max(1, ...cles.map((c) => repartition[c])));
  const valeur = (cle: CleStatut) => (mode === 'taux' ? pourcentage(repartition[cle], actives) : repartition[cle]);
  const suffixe = mode === 'taux' ? '%' : '';
  const ouvrirTaches = () => onNavigate('project-detail', { id: projet.id, tab: 'taches' });

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-600">
          <span className="font-semibold text-slate-900">{projet.titre}</span>
          <ProjectStatusBadge status={projet.statut} />
          <span className="font-mono tabular-nums">Échéance {formatJour(projet.date_fin_prevue)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums font-semibold text-slate-900">Avancement : {taux}%</span>
          <span aria-hidden="true">·</span>
          <span>
            Chef : <strong className="text-slate-800">{chefs(projet)}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('project-detail', { id: projet.id, tab: 'statistiques' })}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-800 hover:text-brand-950 whitespace-nowrap shrink-0 transition-colors"
        >
          Statistiques détaillées
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <Repere max={max} suffixe={suffixe} largeurMin="min-w-[320px]">
        {cles.map((cle) => {
          const v = valeur(cle);
          const hauteur = (v / max) * 100;

          return (
            <button
              key={cle}
              type="button"
              onMouseEnter={() => setSurvol(cle)}
              onMouseLeave={() => setSurvol(null)}
              onFocus={() => setSurvol(cle)}
              onBlur={() => setSurvol(null)}
              onClick={ouvrirTaches}
              aria-label={`${projet.titre} : ${STATUTS[cle].label}, ${repartition[cle]} tâche(s)`}
              className={`${classeColonne(survol === cle)} max-w-[140px]`}
            >
              <div className="h-56 flex items-end justify-center">
                <div className="relative w-12 sm:w-16 h-full flex items-end justify-center">
                  <Etiquette hauteur={hauteur}>
                    {v}
                    {suffixe}
                  </Etiquette>
                  <Barre hauteur={hauteur} vide={repartition[cle] === 0} fond={STATUTS[cle].fond} survol={survol === cle} />
                </div>
              </div>
              <span
                className={`pt-2.5 text-xs font-semibold text-center transition-colors ${
                  survol === cle ? 'text-brand-800' : 'text-slate-800'
                }`}
              >
                {STATUTS[cle].label}
              </span>
            </button>
          );
        })}
      </Repere>

      <div className="mt-4 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-7">
        {survol ? (
          <>
            <span className="font-semibold text-slate-900">
              {projet.titre} — {STATUTS[survol].label}
            </span>
            <span className={`font-mono tabular-nums text-[11px] font-semibold ${STATUTS[survol].texte}`}>
              {repartition[survol]}/{survol === 'annule' ? total : actives} · {pourcentage(repartition[survol], survol === 'annule' ? total : actives)}%
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-500">Survolez une barre pour afficher le détail</span>
            <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-800">
              Avancement global du projet : {taux}%
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// --- Plusieurs projets : une colonne par projet ---

const ProjetsComparés: React.FC<{ lignes: Ligne[]; mode: Mode; onNavigate: AvancementParProjetProps['onNavigate'] }> = ({
  lignes,
  mode,
  onNavigate,
}) => {
  const [survolId, setSurvolId] = useState<number | null>(null);

  const max = mode === 'taux' ? 100 : axeMax(Math.max(1, ...lignes.flatMap((l) => STATUTS_NOMBRE.map((c) => l.repartition[c]))));
  const suffixe = mode === 'taux' ? '%' : '';
  const survol = lignes.find((l) => l.projet.id === survolId) ?? null;

  const couleurTaux = ({ taux, enRetard }: Repartition) =>
    taux >= 100 ? 'bg-emerald-600' : enRetard > 0 ? 'bg-rose-600' : 'bg-brand-700';

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          {mode === 'taux'
            ? [
                { fond: 'bg-brand-700', label: 'Projet en progression' },
                { fond: 'bg-emerald-600', label: 'Objectif atteint (100%)' },
                { fond: 'bg-rose-600', label: 'Contient des tâches en retard' },
              ].map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-xs ${l.fond}`} aria-hidden="true" />
                  {l.label}
                </span>
              ))
            : STATUTS_NOMBRE.map((cle) => (
                <span key={cle} className="inline-flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-xs ${STATUTS[cle].fond}`} aria-hidden="true" />
                  {STATUTS[cle].label}
                </span>
              ))}
        </div>
        <span className="text-slate-400">Cliquez sur une barre pour ouvrir les statistiques du projet</span>
      </div>

      <Repere max={max} suffixe={suffixe} largeurMin="min-w-[360px]">
        {lignes.map(({ projet, repartition }) => {
          const estSurvol = survolId === projet.id;

          return (
            <button
              key={projet.id}
              type="button"
              onMouseEnter={() => setSurvolId(projet.id)}
              onMouseLeave={() => setSurvolId(null)}
              onFocus={() => setSurvolId(projet.id)}
              onBlur={() => setSurvolId(null)}
              onClick={() => onNavigate('project-detail', { id: projet.id, tab: 'statistiques' })}
              aria-label={`${projet.titre} : ${repartition.taux} % d'avancement (${repartition.termine} sur ${repartition.actives} tâches terminées)`}
              className={`${classeColonne(estSurvol)} min-w-24 max-w-50 group`}
            >
              <div className="h-56 flex items-end justify-center">
                {mode === 'taux' ? (
                  <div className="relative w-12 sm:w-14 h-full flex items-end justify-center">
                    <Etiquette hauteur={repartition.taux}>{repartition.taux}%</Etiquette>
                    <Barre
                      hauteur={repartition.taux}
                      vide={repartition.taux === 0}
                      fond={couleurTaux(repartition)}
                      survol={estSurvol}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-end justify-center gap-1.5 px-1">
                    {STATUTS_NOMBRE.map((cle) => {
                      const hauteur = (repartition[cle] / max) * 100;
                      return (
                        <div
                          key={cle}
                          title={`${STATUTS[cle].label} : ${repartition[cle]}`}
                          className="relative flex-1 max-w-5.5 h-full flex items-end justify-center"
                        >
                          {repartition[cle] > 0 && (
                            <span
                              style={{ bottom: `calc(${hauteur}% + 4px)` }}
                              className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono tabular-nums font-semibold text-slate-700 leading-none pointer-events-none"
                            >
                              {repartition[cle]}
                            </span>
                          )}
                          <div
                            style={{ height: `${hauteur}%`, minHeight: repartition[cle] > 0 ? '4px' : '0px' }}
                            className={`w-full rounded-t-sm transition-all duration-200 ${STATUTS[cle].fond}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <span
                className={`pt-2.5 text-xs font-semibold leading-snug line-clamp-2 transition-colors ${
                  estSurvol ? 'text-brand-800' : 'text-slate-800 group-hover:text-brand-800'
                }`}
              >
                {projet.titre}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                {chefs(projet)} <span className="font-mono tabular-nums">· {repartition.taux}%</span>
              </span>
            </button>
          );
        })}
      </Repere>

      <div className="mt-4 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-7">
        {survol ? (
          <>
            <span className="font-semibold text-slate-900 truncate max-w-60">{survol.projet.titre}</span>
            <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[11px]">
              {STATUTS_NOMBRE.map((cle, i) => (
                <React.Fragment key={cle}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span>
                    {STATUTS[cle].label} :{' '}
                    <strong className={survol.repartition[cle] > 0 ? STATUTS[cle].texte : 'text-slate-700'}>
                      {survol.repartition[cle]}
                    </strong>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-500">Survolez une barre pour voir la répartition complète du projet</span>
            <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-800">
              {lignes.length} {lignes.length > 1 ? 'projets affichés' : 'projet affiché'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// --- Zone complète ---

export const AvancementParProjet: React.FC<AvancementParProjetProps> = ({ projets, onNavigate }) => {
  const [mode, setMode] = useState<Mode>('taux');
  const [filtre, setFiltre] = useState<FiltreStatut>('all');
  const [choix, setChoix] = useState<string>('all');

  const lignes = useMemo<Ligne[]>(
    () =>
      projets
        .filter((p) => filtre === 'all' || p.statut === filtre)
        .map((projet) => ({ projet, repartition: repartitionProjet(projet) })),
    [projets, filtre]
  );

  // Si le projet choisi disparaît (changement de filtre), on revient à la comparaison globale
  const selection = lignes.some((l) => String(l.projet.id) === choix) ? choix : 'all';
  const affichees = selection === 'all' ? lignes : lignes.filter((l) => String(l.projet.id) === selection);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Avancement comparé par projet</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Affichage en diagramme en barres projet par projet ou en comparaison globale.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-2 self-start lg:self-auto">
          <select
            aria-label="Projet à afficher dans le diagramme"
            value={selection}
            onChange={(e) => setChoix(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-brand-700 w-full sm:w-auto max-w-65"
          >
            <option value="all">Tous les projets ({lignes.length})</option>
            {lignes.map(({ projet }) => (
              <option key={projet.id} value={String(projet.id)}>
                Projet : {projet.titre}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl label="Type d'affichage" value={mode} options={MODES} onChange={setMode} />
            <SegmentedControl label="Filtrer par statut de projet" value={filtre} options={FILTRES} onChange={setFiltre} />
          </div>
        </div>
      </div>

      {affichees.length === 0 ? (
        <p className="py-12 text-center text-xs text-slate-500">Aucun projet ne correspond à ce filtre.</p>
      ) : selection !== 'all' ? (
        <ProjetUnique key={`${selection}-${mode}`} ligne={affichees[0]} mode={mode} onNavigate={onNavigate} />
      ) : (
        <ProjetsComparés key={mode} lignes={affichees} mode={mode} onNavigate={onNavigate} />
      )}
    </div>
  );
};
