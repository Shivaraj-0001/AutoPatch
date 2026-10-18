'use client';

import dynamic from 'next/dynamic';

const AutoPatchApp = dynamic(
  () => import('@/components/AutoPatchApp').then((mod) => mod.AutoPatchApp),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0e17',
          color: '#94a3b8',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ fontSize: '14px', letterSpacing: '0.05em' }}>Loading AutoPatch...</p>
        </div>
      </div>
    ),
  },
);

export default function HomePage() {
  return <AutoPatchApp />;
}
