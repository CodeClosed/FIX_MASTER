import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Wrench, ArrowRight, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [regOrEmpId, setRegOrEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, getHomeRouteForRole } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isExpired = searchParams.get('expired') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOrEmpId.trim() || !password) {
      setErrorMsg('Please enter both Register/Employee ID and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const loggedUser = await login(regOrEmpId.trim(), password);
      showToast(`Welcome back, ${loggedUser.full_name}!`, 'success');
      navigate(getHomeRouteForRole(loggedUser.role), { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 mb-3">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            FIX_MASTER
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            VIT Vellore Hostel Maintenance & Service Dispatch
          </p>
        </div>

        {isExpired && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Your session expired after 24 hours. Please log in again.</span>
          </div>
        )}

        {/* Demo credentials hint */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Demo Accounts</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Seed accounts (e.g. <span className="font-mono text-slate-300">21BCE0843</span> for a
            student, <span className="font-mono text-slate-300">SUP_LBLOCK_01</span> for the
            supervisor) all use the password{' '}
            <span className="font-mono text-slate-300">Password@123</span>. New here? Register a
            fresh account below instead.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Register No / Employee ID
            </label>
            <input
              type="text"
              value={regOrEmpId}
              onChange={(e) => setRegOrEmpId(e.target.value)}
              placeholder="e.g. 21BCE0843 or EMP1042"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 ml-1 inline-flex items-center gap-1"
            >
              <span>Create Account</span>
              <Sparkles className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
