import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { useERP } from '../context/ERPContext';
import { Shield, Key, Mail, Lock, User, AlertCircle, Loader, Users, CheckCircle2 } from 'lucide-react';

export const LoginView = ({ onAuthSuccess }) => {
  const { loginWithCredentials } = useERP();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Admin');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        // Sign up logic
        if (!isSupabaseConfigured) {
          throw new Error('User registration is managed by Administrator in local database mode.');
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData?.user) {
          // Create the profiles entry
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              name: fullName || email.split('@')[0],
              email: email,
              role: role,
            });

          if (profileError) throw profileError;

          setSuccessMsg('Registration successful! Please check your email for confirmation or sign in.');
          setIsSignUp(false);
        }
      } else {
        // Try local SQLite ERP database authentication first!
        if (loginWithCredentials) {
          try {
            const res = await loginWithCredentials(email, password);
            if (res && res.success) {
              setSuccessMsg(`Welcome, ${res.user.name || res.user.username}!`);
              if (onAuthSuccess) onAuthSuccess();
              return;
            } else if (res && !res.success && !isSupabaseConfigured) {
              throw new Error(res.error || 'Invalid username or password.');
            }
          } catch (localErr) {
            if (!isSupabaseConfigured) {
              throw localErr;
            }
          }
        }

        // Fallback to Supabase if configured
        if (isSupabaseConfigured) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) throw authError;

          if (authData?.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (!profileData) {
              await supabase.from('profiles').insert({
                id: authData.user.id,
                name: email.split('@')[0],
                email: email,
                role: 'Admin',
              });
            }
          }
          if (onAuthSuccess) onAuthSuccess();
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 10% 20%, #1e293b 0%, #0f172a 100%)',
      padding: '1.5rem',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: '2.5rem',
        color: '#f8fafc'
      }}>
        {/* Header Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            padding: '12px',
            borderRadius: '14px',
            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            ScreenArts Cloud ERP
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Sign in to access your printing & job costing platform
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            color: '#fda4af',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            color: '#a7f3d0',
            fontSize: '0.875rem'
          }}>
            <User size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isSignUp && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Designated Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Admin" style={{ background: '#1e293b', color: '#ffffff' }}>Admin</option>
                  <option value="Manager" style={{ background: '#1e293b', color: '#ffffff' }}>Manager</option>
                  <option value="Sales" style={{ background: '#1e293b', color: '#ffffff' }}>Sales Officer</option>
                  <option value="Designer" style={{ background: '#1e293b', color: '#ffffff' }}>Designer</option>
                  <option value="Production" style={{ background: '#1e293b', color: '#ffffff' }}>Production Operator</option>
                  <option value="Accounts" style={{ background: '#1e293b', color: '#ffffff' }}>Accounts Executive</option>
                  <option value="Delivery" style={{ background: '#1e293b', color: '#ffffff' }}>Delivery Executive</option>
                </select>
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.75 : 1
            }}
          >
            {loading ? <Loader size={20} className="animate-spin" /> : <Key size={20} />}
            {isSignUp ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Form Mode */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign In here' : 'Register here'}
          </button>
        </div>

        {/* Quick Workstation Access */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '0.65rem', textAlign: 'center' }}>
            ⚡ QUICK FACTORY WORKSTATION LOGIN
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={() => { setEmail('admin'); setPassword('Admin@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              👑 Admin (Minhaj V)
            </button>
            <button
              type="button"
              onClick={() => { setEmail('billing'); setPassword('Billing@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              💼 Billing Counter
            </button>
            <button
              type="button"
              onClick={() => { setEmail('designer'); setPassword('Design@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(236,72,153,0.15)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              🎨 Studio Designer
            </button>
            <button
              type="button"
              onClick={() => { setEmail('operator'); setPassword('Print@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(14,165,233,0.15)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              🖨️ Roland Operator
            </button>
            <button
              type="button"
              onClick={() => { setEmail('finisher'); setPassword('Finish@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(217,119,6,0.15)', color: '#fcd34d', border: '1px solid rgba(217,119,6,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              ✂️ Finishing Worker
            </button>
            <button
              type="button"
              onClick={() => { setEmail('qc'); setPassword('QC@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.15)', color: '#fde047', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              🔍 QC Staff
            </button>
            <button
              type="button"
              onClick={() => { setEmail('accounts'); setPassword('Accounts@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              💰 Accounts Dept
            </button>
            <button
              type="button"
              onClick={() => { setEmail('delivery'); setPassword('Delivery@123'); }}
              style={{ padding: '0.45rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#a7f3d0', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
            >
              🚚 Delivery Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
