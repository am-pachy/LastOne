import { useState } from 'react';
import { supabase } from './supabaseClient';
import logo from './assets/golden-snake-logo.png';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'error' | 'success'>('error');

  async function ensureUserProfile(userId: string, userEmail: string) {
    const emailName = userEmail.split('@')[0] || 'Utente';
    const normalizedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);

    await supabase.from('user_profiles').upsert(
      {
        id: userId,
        first_name: normalizedName,
        partner_name: null,
        custom_categories: [],
      },
      { onConflict: 'id' }
    );
  }

  async function handleSubmit() {
    setMsg('');

    if (!email.trim() || !password.trim()) {
      setMsgType('error');
      setMsg('Inserisci email e password.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

        if (error) {
          setMsgType('error');
          setMsg(error.message);
          setLoading(false);
          return;
        }

        const userId = data.user?.id;
        if (userId) {
          await ensureUserProfile(userId, email.trim());
        }

        const hasSession = !!data.session;
        setMsgType('success');
        setMsg(
          hasSession
            ? 'Registrazione completata! Ora puoi usare l\'app.'
            : 'Registrazione completata! Controlla la mail di conferma prima di accedere.'
        );
        setIsRegister(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('email not confirmed')) {
          setMsgType('error');
          setMsg('Devi prima confermare la tua email dal link ricevuto via mail.');
        } else {
          setMsgType('error');
          setMsg('Credenziali non valide.');
        }
        setLoading(false);
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        await ensureUserProfile(userId, data.user.email || email.trim());
      }
    } catch {
      setMsgType('error');
      setMsg('Errore imprevisto.');
    }

    setLoading(false);
  }

  async function handleResetPassword() {
    setMsg('');

    if (!email.trim()) {
      setMsgType('error');
      setMsg('Inserisci prima la tua email per recuperare la password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    if (error) {
      setMsgType('error');
      setMsg(error.message);
    } else {
      setMsgType('success');
      setMsg('Ti abbiamo inviato una mail per reimpostare la password.');
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    setMsg('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      setMsgType('error');
      setMsg(error.message);
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={logo} alt="SalvadaNoi logo" style={styles.logo} />

        <h1 style={styles.title}>SalvadaNoi</h1>
        <p style={styles.subtitle}>Il vostro risparmio, insieme. 🐍</p>

        <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />

        <button style={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Caricamento...' : isRegister ? 'Registrati' : 'Entra'}
        </button>

        <button style={styles.googleButton} onClick={handleGoogleLogin} disabled={loading}>
          Continua con Google
        </button>

        {!isRegister ? (
          <button style={styles.secondaryLinkButton} onClick={handleResetPassword} disabled={loading}>
            Password dimenticata?
          </button>
        ) : null}

        {msg ? (
          <p
            style={{
              ...styles.message,
              color: msgType === 'success' ? '#166534' : '#b91c1c',
              backgroundColor: msgType === 'success' ? '#DCFCE7' : '#FEE2E2',
              border: `1px solid ${msgType === 'success' ? '#86EFAC' : '#FCA5A5'}`,
            }}
          >
            {msg}
          </p>
        ) : null}

        <p style={styles.switch}>
          {isRegister ? 'Hai già un account?' : 'Nuovo qui?'}
          <span
            style={styles.link}
            onClick={() => {
              setMsg('');
              setIsRegister(!isRegister);
            }}
          >
            {isRegister ? ' Accedi' : ' Registrati'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    background: 'white',
    padding: '32px 24px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  logo: { width: 110, height: 110, objectFit: 'contain', marginBottom: 12 },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 8, marginBottom: 24, fontSize: 16 },
  input: {
    width: '100%',
    padding: '14px',
    marginBottom: 14,
    borderRadius: 14,
    border: '1px solid #dbe2ea',
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: 14,
    border: 'none',
    background: '#4A6CF7',
    color: 'white',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 12,
  },
  googleButton: {
    width: '100%',
    padding: '14px',
    borderRadius: 14,
    border: '1px solid #dbe2ea',
    background: 'white',
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 10,
  },
  secondaryLinkButton: {
    background: 'none',
    border: 'none',
    color: '#4A6CF7',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 10,
  },
  message: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 1.4,
    borderRadius: 12,
    padding: '10px 12px',
  },
  switch: { marginTop: 14, fontSize: 14, color: '#64748b' },
  link: { color: '#4A6CF7', cursor: 'pointer', marginLeft: 6, fontWeight: 600 },
};
