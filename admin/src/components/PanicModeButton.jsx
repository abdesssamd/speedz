import React, { useState } from 'react';

export default function PanicModeButton({ restaurantId, onToggle = () => {} }) {
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4100'}/restaurants/${restaurantId}/panic`, { method: 'POST' });
      onToggle();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="danger-outline rounded-xl px-3 py-2 text-sm" onClick={toggle} disabled={loading}>
      {loading ? '...' : 'Panic Mode'}
    </button>
  );
}
