'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'anion-cookie-consent-v1';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = window.localStorage.getItem(STORAGE_KEY);
      if (!choice) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function saveChoice(choice: 'accepted' | 'essential-only') {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ignore storage failures and still dismiss to avoid trapping the UI.
    }
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        left: '16px',
        right: '16px',
        bottom: '16px',
        zIndex: 1000,
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: '10px',
        padding: '16px',
        maxWidth: '760px',
        margin: '0 auto',
      }}
    >
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-body)' }}>
        We use essential cookies for sign-in and session security. Optional analytics cookies can be enabled to help improve platform quality.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
        Read details in our <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={() => saveChoice('essential-only')}>
          Essential only
        </button>
        <button type="button" className="btn-primary" onClick={() => saveChoice('accepted')}>
          Accept all
        </button>
      </div>
    </aside>
  );
}
