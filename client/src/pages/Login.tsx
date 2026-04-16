import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const ROLE_PATHS: Record<string, string> = {
  admin: '/admin',
  superadmin: '/admin',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('instytu_user', JSON.stringify(data));
      localStorage.setItem('instytu_token', data.token);
      window.location.href = ROLE_PATHS[data.role] || '/admin';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-xl">🎓</div>
            <div>
              <div className="text-white font-bold text-xl">Instytu</div>
              <div className="text-blue-200 text-xs font-mono">Institution OS</div>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Everything your<br />institution needs,<br />
            <span className="text-blue-300">in one place.</span>
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
            End-to-end management for schools, colleges and institutes — for every role, one login.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Fee Management', 'Attendance', 'Grades', 'Homework', 'Leave Tracking', 'Staff Management'].map(m => (
              <span key={m} className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full px-3 py-1 text-xs text-white">{m}</span>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex gap-4">
          {[['500+', 'Institutions'], ['2M+', 'Students'], ['99.9%', 'Uptime']].map(([n, l]) => (
            <div key={l} className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-xl px-4 py-3">
              <div className="text-white font-bold text-xl">{n}</div>
              <div className="text-blue-200 text-xs font-mono mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">🎓</div>
            <span className="font-bold text-gray-900">Instytu</span>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in with your email and password — your portal is set automatically.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-gray-600 block mb-1">Email address</label>
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                autoComplete="email" required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold text-gray-600 block mb-1">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password" required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Registering a new institution?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-blue-500 font-semibold hover:underline"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
