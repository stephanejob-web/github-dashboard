import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { GitBranch } from 'lucide-react'

export default function AuthGate({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><LoginPage /></SignedOut>
    </>
  )
}

function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--navy)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glows */}
      <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(66,42,251,0.18) 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(1,181,116,0.12) 0%,transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg,#4318ff,#01b574)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(66,42,251,0.4)',
        }}>
          <GitBranch size={24} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em' }}>GitPulse</p>
          <p style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>Dashboard Scrum Master</p>
        </div>
      </div>

      {/* Clerk SignIn UI */}
      <SignIn
        appearance={{
          elements: {
            rootBox: { width: '100%', maxWidth: 420 },
            card: {
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            },
            headerTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: 800 },
            headerSubtitle: { color: '#718096' },
            formFieldLabel: { color: '#a0aec0', fontSize: 12 },
            formFieldInput: {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
              borderRadius: 10,
            },
            formButtonPrimary: {
              background: 'linear-gradient(135deg,#4318ff,#7551ff)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(66,42,251,0.4)',
            },
            socialButtonsBlockButton: {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
              borderRadius: 10,
            },
            footerActionLink: { color: '#868cff' },
            dividerLine: { background: 'rgba(255,255,255,0.08)' },
            dividerText: { color: '#4a5568' },
          },
        }}
      />
    </div>
  )
}
