import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useHotkeys } from 'react-hotkeys-hook';

export default function OmniSearch({ items = [], onSelect = () => {} }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const fuse = useMemo(() => new Fuse(items, { keys: ['name', 'phone', 'email'], threshold: 0.3 }), [items]);

  useHotkeys('ctrl+k', (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  });

  if (!open) return null;
  const results = q ? fuse.search(q).map((r) => r.item) : items.slice(0, 8);

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-20 z-50">
      <div className="w-[720px] bg-white rounded-xl shadow-lg p-4">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="search-input" placeholder="Rechercher restaurant, client, téléphone..." />
        <div className="mt-2 max-h-60 overflow-auto">
          {results.map((r) => (
            <div key={r.id || r.phone} onClick={() => { onSelect(r); setOpen(false); }} className="p-2 hover:bg-slate-50 rounded cursor-pointer">
              <div className="font-medium">{r.name || r.title || r.phone}</div>
              <div className="text-xs text-slate-500">{r.phone || r.email || r.city}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
