import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldAlert, CheckCircle, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('operator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, role, fullName);
        setSuccess('Account created successfully! You can now log in.');
        setIsRegister(false);
        setPassword('');
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsRegister(false);
    setError('');
  };

  return (
    <div className="min-h-screen w-screen bg-industry-950 industrial-grid flex items-center justify-center p-4 relative scanline">
      {/* Top Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800 glow-blue overflow-hidden relative z-10 transition-all duration-300">
        <div className="p-8">
          {/* Header branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-sky-950/80 rounded-2xl border border-sky-800 mb-3 glow-blue">
              <Activity className="h-8 w-8 text-sky-400 animate-pulse-slow" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans text-center">
              SmartPredict Portal
            </h2>
            <p className="text-slate-400 text-xs mt-1 text-center font-mono uppercase tracking-wider">
              {isRegister ? 'Register Industrial Operator' : 'Enterprise Telemetry Terminal'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm font-sans outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Security Email</label>
              <input
                type="email"
                required
                placeholder="operator@factory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm font-sans outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terminal Access Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm font-sans outline-none transition-all"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Role Classification</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-slate-100 text-sm font-sans outline-none transition-all"
                >
                  <option value="operator">Machine Operator</option>
                  <option value="engineer">Maintenance Engineer</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider glow-blue transition-all duration-200"
            >
              {submitting ? 'Authenticating...' : isRegister ? 'Provision Account' : 'Initialize Session'}
            </button>
          </form>

          {/* Toggle register view */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-4"
            >
              {isRegister ? 'Return to sign in' : 'Create new engineer credential'}
            </button>
          </div>
        </div>

        {/* Demo filler panel */}
        {!isRegister && (
          <div className="bg-slate-900/50 border-t border-slate-800/80 p-6 flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              <span>Fast-fill Demo Identities</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@factory.com', 'admin123')}
                className="py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg text-[10px] font-bold text-sky-300 uppercase tracking-wider transition"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('engineer@factory.com', 'engineer123')}
                className="py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg text-[10px] font-bold text-sky-300 uppercase tracking-wider transition"
              >
                Engineer
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('operator@factory.com', 'operator123')}
                className="py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg text-[10px] font-bold text-sky-300 uppercase tracking-wider transition"
              >
                Operator
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
