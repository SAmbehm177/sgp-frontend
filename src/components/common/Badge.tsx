import React from 'react';
import { TaskStatus, TaskPriority, ProjectStatus, MemberStatus } from '../../types/sgp';

interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
}

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const configs = {
    en_cours: {
      label: 'En cours',
      bgClass: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60',
    },
    termine: {
      label: 'Terminé',
      bgClass: 'bg-blue-50/80 text-blue-800 border-blue-200/60',
    },
    suspendu: {
      label: 'Suspendu',
      bgClass: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
    },
    annule: {
      label: 'Annulé',
      bgClass: 'bg-rose-50/80 text-rose-800 border-rose-200/60',
    },
  };

  const current = configs[status] || configs.en_cours;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border ${current.bgClass} ${className} whitespace-nowrap`}
    >
      {current.label}
    </span>
  );
};

export const TaskStatusBadge: React.FC<{
  status: TaskStatus;
  isOverdue?: boolean;
  className?: string;
}> = ({ status, isOverdue = false, className = '' }) => {
  if (isOverdue && status !== 'termine') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md border bg-rose-50 text-rose-800 border-rose-200 ${className} whitespace-nowrap`}
        title="Date d'échéance dépassée"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" aria-hidden="true" />
        En retard
      </span>
    );
  }

  const configs = {
    en_cours: {
      label: 'En cours',
      bgClass: 'bg-amber-50/80 text-amber-800 border-amber-200/70',
    },
    termine: {
      label: 'Terminé',
      bgClass: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/70',
    },
    annule: {
      label: 'Annulé',
      bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  };

  const current = configs[status] || configs.en_cours;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border ${current.bgClass} ${className} whitespace-nowrap`}
    >
      {current.label}
    </span>
  );
};

export const TaskPriorityBadge: React.FC<{ priority: TaskPriority; className?: string }> = ({
  priority,
  className = '',
}) => {
  const configs = {
    basse: {
      label: 'Basse',
      bgClass: 'bg-slate-50 text-slate-600 border-slate-200',
    },
    moyenne: {
      label: 'Moyenne',
      bgClass: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    haute: {
      label: 'Haute',
      bgClass: 'bg-orange-50 text-orange-700 border-orange-200 font-medium',
    },
    urgente: {
      label: 'Urgente',
      bgClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    },
  };

  const current = configs[priority] || configs.moyenne;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-md border ${current.bgClass} ${className} whitespace-nowrap`}
    >
      {current.label}
    </span>
  );
};

export const MemberStatusBadge: React.FC<{ status: MemberStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const isActif = status === 'actif';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${
        isActif
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200'
      } ${className} whitespace-nowrap`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isActif ? 'bg-emerald-500' : 'bg-slate-400'}`}
        aria-hidden="true"
      />
      {isActif ? 'Actif' : 'Retiré'}
    </span>
  );
};
