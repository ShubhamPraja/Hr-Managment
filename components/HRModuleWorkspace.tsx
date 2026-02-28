'use client';

import React from 'react';
import { HR_MODULE_CATALOG, type HRModuleId } from '@/constants/hr-module-catalog';
import { useAuth } from '@/hooks/use-auth';

type HRModuleWorkspaceProps = {
  moduleId: HRModuleId;
};

const badgeStyles = {
  P0: 'bg-red-50 text-red-700 border-red-100',
  P1: 'bg-amber-50 text-amber-700 border-amber-100',
  P2: 'bg-blue-50 text-blue-700 border-blue-100',
  'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Planned: 'bg-slate-100 text-slate-600 border-slate-200',
} as const;

const HRModuleWorkspace: React.FC<HRModuleWorkspaceProps> = ({ moduleId }) => {
  const { user: currentUser } = useAuth();
  const moduleConfig = HR_MODULE_CATALOG[moduleId];

  const hasAccess = currentUser ? moduleConfig.roles.includes(currentUser.role) : false;

  if (!hasAccess) {
    return (
      <div className="panel-surface rounded-2xl p-10 text-center">
        <h1 className="font-heading ui-title-md text-[var(--color-text)] mb-3">Access Restricted</h1>
        <p className="ui-subtitle text-[var(--color-text-soft)] max-w-xl mx-auto">
          Your role does not have access to this module yet. Ask Admin/HR to grant the required permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 motion-fade">
      <section className="panel-surface rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-2.5 py-1 ui-label rounded-full bg-[var(--surface-2)] text-[var(--color-text-soft)]">
            {moduleConfig.category}
          </span>
          <span
            className={`px-2.5 py-1 ui-label rounded-full border ${badgeStyles[moduleConfig.priority]}`}
          >
            {moduleConfig.priority} Priority
          </span>
          <span
            className={`px-2.5 py-1 ui-label rounded-full border ${badgeStyles[moduleConfig.status]}`}
          >
            {moduleConfig.status}
          </span>
        </div>

        <h1 className="font-heading ui-page-title text-[var(--color-text)] mb-3">{moduleConfig.title}</h1>
        <p className="ui-subtitle text-[var(--color-text-soft)] max-w-4xl">{moduleConfig.description}</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {moduleConfig.roles.map((role) => (
            <span
              key={role}
              className={`px-3 py-1 rounded-full ui-label ${
                role === 'Admin'
                  ? 'bg-purple-50 text-purple-700'
                  : role === 'HR'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {role}
            </span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <article className="panel-surface rounded-2xl p-6">
          <h2 className="font-heading ui-section-title text-[var(--color-text)] mb-4">Business Outcomes</h2>
          <ul className="space-y-3">
            {moduleConfig.outcomes.map((outcome) => (
              <li key={outcome} className="ui-subtitle text-[var(--color-text-soft)] flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent-600)] shrink-0" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-surface rounded-2xl p-6">
          <h2 className="font-heading ui-section-title text-[var(--color-text)] mb-4">Key Workflows</h2>
          <ul className="space-y-3">
            {moduleConfig.keyWorkflows.map((workflow) => (
              <li key={workflow} className="ui-subtitle text-[var(--color-text-soft)] flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>{workflow}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel-surface rounded-2xl p-6">
          <h2 className="font-heading ui-section-title text-[var(--color-text)] mb-4">Launch KPIs</h2>
          <ul className="space-y-3">
            {moduleConfig.launchMetrics.map((metric) => (
              <li key={metric} className="ui-subtitle text-[var(--color-text-soft)] flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="bg-[linear-gradient(120deg,var(--accent-700),var(--accent-600))] text-white rounded-2xl p-6 md:p-8 shadow-lg">
        <h2 className="font-heading ui-section-title mb-4">Execution Note</h2>
        <p className="text-white/85 ui-subtitle leading-relaxed">
          This module is scaffolded and ready for feature delivery. Next step is wiring this page to APIs,
          database models, and permission policies for production behavior.
        </p>
      </section>
    </div>
  );
};

export default HRModuleWorkspace;
