import React, { useMemo, useState } from 'react';
import { Projet, RouteParams } from '../../../types/sgp';
import { repartitionGlobale } from '../../../utils/avancement';
import { RepartitionDonut } from './RepartitionDonut';
import { ProgressionMensuelle } from './ProgressionMensuelle';
import { AvancementParProjet } from './AvancementParProjet';

interface AnalyseAvancementProps {
  projets: Projet[]; // projets visibles par l'utilisateur connecté (déjà filtrés par l'API selon son rôle)
  onNavigate: (route: string, params?: RouteParams) => void;
}

export const AnalyseAvancement: React.FC<AnalyseAvancementProps> = ({ projets, onNavigate }) => {
  const [choix, setChoix] = useState<string>('all');

  // Un projet annulé ne produit plus d'avancement : on l'écarte de toutes les analyses
  const suivis = useMemo(() => projets.filter((p) => p.statut !== 'annule'), [projets]);

  const perimetre = suivis.some((p) => String(p.id) === choix) ? choix : 'all';
  const projetsPerimetre = useMemo(
    () => (perimetre === 'all' ? suivis : suivis.filter((p) => String(p.id) === perimetre)),
    [suivis, perimetre]
  );
  const repartition = useMemo(() => repartitionGlobale(projetsPerimetre), [projetsPerimetre]);

  if (suivis.length === 0) return null;

  return (
    <section aria-labelledby="analyse-avancement" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="analyse-avancement" className="text-sm font-bold text-slate-900">
            Analyse graphique de l'avancement
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Répartition des tâches, progression dans le temps et avancement comparé par projet.
          </p>
        </div>

        {suivis.length > 1 && (
          <select
            aria-label="Périmètre des graphiques de répartition et de progression"
            value={perimetre}
            onChange={(e) => setChoix(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-brand-700 max-w-60"
          >
            <option value="all">Périmètre : tous les projets</option>
            {suivis.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.titre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5">
          <RepartitionDonut repartition={repartition} />
        </div>
        <div className="lg:col-span-7">
          <ProgressionMensuelle projets={projetsPerimetre} />
        </div>
      </div>

      <AvancementParProjet projets={suivis} onNavigate={onNavigate} />
    </section>
  );
};
