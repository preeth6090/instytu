import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

const Login = () => {
  const [portal, setPortal] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login clicked', email, password);
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      console.log('Login response:', data);
      localStorage.setItem('instytu_user', JSON.stringify(data));
      localStorage.setItem('instytu_token', data.token);
      console.log('Redirecting to:', `/${data.role}`);
      window.location.href = `/${data.role}`;
    } catch (err: any) {
      console.log('Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const portals = [
    { id: 'admin', label: 'Admin', desc: 'School management', icon: '🏫' },
    { id: 'teacher', label: 'Teacher', desc: 'Staff portal', icon: '👨‍🏫' },
    { id: 'student', label: 'Student', desc: 'Academic portal', icon: '🎒' },
    { id: 'parent', label: 'Parent', desc: 'Monitor progress', icon: '👨‍👩‍👧' },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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
            End-to-end management for schools, colleges and institutes.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Fee Management', 'Attendance', 'Grades', 'Library', 'Leave Tracking', 'Staff Management'].map(m => (
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

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your Instytu portal</p>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select your portal</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {portals.map(p => (
              <div key={p.id} onClick={() => setPortal(p.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${portal === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${portal === p.id ? 'bg-blue-500' : 'bg-gray-100'}`}>{p.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{p.label}</div>
                  <div className="text-xs text-gray-400">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label htmlFor="email" className="text-xs font-semibold text-gray-600 mb-1 block">Email address</label>
              <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@institution.edu" autoComplete="email" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="mb-5">
              <label htmlFor="password" className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
              <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50">
              {loading ? 'Signing in...' : `Sign in to ${portals.find(p => p.id === portal)?.label} Portal →`}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Don't have an account? <span className="text-blue-500 cursor-pointer">Contact your administrator</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;