import React from 'react';

export default function EmptyState({ title = 'Aucune donnée', subtitle = '', children }) {
  return (
    <div className="empty-slot p-8">
      <div className="text-lg font-semibold">{title}</div>
      {subtitle ? <div className="mt-2 text-sm text-slate-500">{subtitle}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
