import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface Branding {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  tagline?: string;
  primaryColor: string;
  type: string;
}

const ROLE_PATHS: Record<string, string> = {
  admin: '/admin', superadmin: '/admin',
  teacher: '/teacher', student: '/student', parent: '/parent',
};

const BrandedLogin = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/institutions/branding/${slug}`)
      .then(r => setBranding(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingBrand(false));
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('instytu_user', JSON.stringify(data));
      localStorage.setItem('instytu_token', data.token);
      window.location.href = ROLE_PATHS[data.role] || '/admin';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (loadingBrand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="text-5xl mb-4">🏫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Institution not found</h1>
        <p className="text-gray-500 text-sm mb-6">The link you followed doesn't match any registered institution.</p>
        <button onClick={() => navigate('/login')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Go to main login
        </button>
      </div>
    );
  }

  const primary = branding!.primaryColor || '#4F46E5';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — institution branded */}
      <div className="hidden lg:flex w-5/12 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            {branding!.logo ? (
              <img src={branding!.logo} alt={branding!.name} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                {branding!.type === 'school' ? '🏫' : branding!.type === 'college' ? '🎓' : '🏛️'}
              </div>
            )}
            <div>
              <div className="text-white font-extrabold text-xl leading-tight">{branding!.name}</div>
              {branding!.tagline && <div className="text-white text-opacity-80 text-xs mt-1 font-medium">{branding!.tagline}</div>}
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white leading-snug mb-3">
            Welcome back.
          </h1>
          <p className="text-white text-opacity-75 text-sm leading-relaxed max-w-xs">
            Sign in to manage attendance, grades, fees, communication, and everything your institution needs.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: '📊', text: 'Real-time attendance & grades' },
              { icon: '💳', text: 'Fee management & online payments' },
              { icon: '📢', text: 'Notices, messages & PTM' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-white text-opacity-85">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white text-opacity-50 text-xs font-mono">
          Powered by Instytu
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            {branding!.logo ? (
              <img src={branding!.logo} alt={branding!.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: primary + '20' }}>
                {branding!.type === 'school' ? '🏫' : '🎓'}
              </div>
            )}
            <div className="font-bold text-gray-900">{branding!.name}</div>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-7">
            {branding!.name} · {branding!.type.charAt(0).toUpperCase() + branding!.type.slice(1)} Portal
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@institution.edu" required autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition-all"
                style={{ '--tw-ring-color': primary } as any}
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = '')} />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none transition-all"
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = '')} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: primary }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don't have an account?{' '}
            <span className="cursor-pointer font-medium" style={{ color: primary }}>
              Contact your administrator
            </span>
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-300">
              Powered by <span className="text-gray-400 font-medium">Instytu</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandedLogin;
