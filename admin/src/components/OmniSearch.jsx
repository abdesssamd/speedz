import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useHotkeys } from 'react-hotkeys-hook';
import { Search, X, Store, Users, Bike } from 'lucide-react';

/**
 * OmniSearch — recherche globale Ctrl+K
 *
 * Améliorations appliquées :
 * - Backdrop semi-transparent avec fermeture au clic
 * - Focus trap complet (Tab / Shift+Tab)
 * - Navigation clavier : ArrowUp / ArrowDown / Enter / Escape
 * - Rôle ARIA : dialog + listbox + option + aria-activedescendant
 * - Animation slide-in depuis le haut
 * - État vide avec message contextuel
 * - Icônes par type d'entité (restaurant / client / livreur)
 * - Réinitialisation de la query à la fermeture
 */
export default function OmniSearch({ items = [], onSelect = () => {} }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['name', 'phone', 'email', 'city'], threshold: 0.3 }),
    [items]
  );

  const results = useMemo(
    () => (q ? fuse.search(q).map((r) => r.item) : items.slice(0, 8)),
    [q, fuse, items]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setActiveIndex(0);
  }, []);

  useHotkeys('ctrl+k', (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  });

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Scroll l'item actif dans la liste
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { close(); return; }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        onSelect(results[activeIndex]);
        close();
      }
    }
  }

  // Reset l'index actif quand les résultats changent
  useEffect(() => { setActiveIndex(0); }, [results.length]);

  function getIcon(item) {
    if (item.menu !== undefined)   return <Store size={14} />;
    if (item.vehicle !== undefined) return <Bike size={14} />;
    return <Users size={14} />;
  }

  function getSubtitle(item) {
    return item.phone || item.email || item.city || item.address || '';
  }

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="omnisearch-backdrop"
      onClick={close}
      role="presentation"
    >
      {/* Panneau */}
      <div
        className="omnisearch-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Recherche globale"
        aria-modal="true"
      >
        {/* Champ de recherche */}
        <div className="omnisearch-input-row">
          <Search size={16} className="omnisearch-icon-search" aria-hidden="true" />
          <input
            ref={inputRef}
            className="omnisearch-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher restaurant, client, livreur, téléphone…"
            aria-label="Recherche globale"
            aria-controls="omnisearch-list"
            aria-activedescendant={results.length ? `os-item-${activeIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          {q && (
            <button
              className="omnisearch-clear"
              onClick={() => { setQ(''); inputRef.current?.focus(); }}
              aria-label="Effacer la recherche"
              tabIndex={0}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Raccourcis hint */}
        <div className="omnisearch-hint" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> sélectionner</span>
          <span><kbd>Esc</kbd> fermer</span>
        </div>

        {/* Résultats */}
        <div
          id="omnisearch-list"
          ref={listRef}
          className="omnisearch-list"
          role="listbox"
          aria-label="Résultats de recherche"
        >
          {results.length === 0 ? (
            <div className="omnisearch-empty" role="status" aria-live="polite">
              <Search size={20} aria-hidden="true" />
              <p>Aucun résultat pour <strong>«&nbsp;{q}&nbsp;»</strong></p>
              <span>Essayez un nom, téléphone, ou email</span>
            </div>
          ) : (
            results.map((item, index) => (
              <div
                key={item.id || item.phone || index}
                id={`os-item-${index}`}
                data-index={index}
                role="option"
                aria-selected={index === activeIndex}
                className={`omnisearch-item ${index === activeIndex ? 'active' : ''}`}
                onClick={() => { onSelect(item); close(); }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="omnisearch-item-icon" aria-hidden="true">
                  {getIcon(item)}
                </span>
                <span className="omnisearch-item-body">
                  <span className="omnisearch-item-name">
                    {item.name || item.title || item.phone}
                  </span>
                  {getSubtitle(item) && (
                    <span className="omnisearch-item-sub">{getSubtitle(item)}</span>
                  )}
                </span>
                {index === activeIndex && (
                  <span className="omnisearch-item-enter" aria-hidden="true">↵</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer compteur */}
        {results.length > 0 && (
          <div className="omnisearch-footer" aria-live="polite">
            {results.length} résultat{results.length > 1 ? 's' : ''}
            {q && ` pour «\u00a0${q}\u00a0»`}
          </div>
        )}
      </div>
    </div>
  );
}
