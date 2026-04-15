import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

type Step = 1 | 2;

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Institution
  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState<'school' | 'college' | 'institute'>('school');
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [institutionPhone, setInstitutionPhone] = useState('');
  const [institutionAddress, setInstitutionAddress] = useState('');

  // Step 2 — Admin account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName || !institutionType) {
      setError('Institution name and type are required');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/auth/register', {
        institutionName, institutionType, institutionEmail,
        institutionPhone, institutionAddress,
        name, email, password,
      });
      localStorage.setItem('instytu_user', JSON.stringify(data));
      localStorage.setItem('instytu_token', data.token);
      // Redirect to admin but show branded login URL in a toast via query param
      const slug = data.institution?.slug;
      window.location.href = `/admin${slug ? `?registered=true&slug=${slug}` : ''}`;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const institutionTypes = [
    { id: 'school', label: 'School', icon: '🏫', desc: 'K-12 / Secondary' },
    { id: 'college', label: 'College', icon: '🎓', desc: 'Degree / Diploma' },
    { id: 'institute', label: 'Institute', icon: '🏛️', desc: 'Coaching / Training' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-indigo-600 flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10">
          <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-indigo-200 hover:text-white text-sm transition-colors mb-10">
            ← Back to login
          </button>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-xl">🎓</div>
            <div>
              <div className="text-white font-bold text-xl">Instytu</div>
              <div className="text-indigo-200 text-xs font-mono">Institution OS</div>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
            Get your institution<br />up and running<br />
            <span className="text-indigo-300">in minutes.</span>
          </h1>
          <p className="text-indigo-100 text-sm leading-relaxed max-w-xs">
            Set up your school, add staff and students, and manage everything from one place.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: '✓', text: 'Free demo — no credit card required' },
              { icon: '✓', text: 'Unlimited students in demo mode' },
              { icon: '✓', text: 'Full access to all features' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-indigo-100">
                <span className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* Step indicator */}
        <div className="relative z-10">
          <div className="text-indigo-200 text-xs font-mono mb-3">SETUP PROGRESS</div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-indigo-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= 1 ? 'bg-white text-indigo-600 border-white' : 'border-indigo-400'}`}>1</div>
              <span className="text-sm font-medium">Institution</span>
            </div>
            <div className={`h-px flex-1 ${step >= 2 ? 'bg-white' : 'bg-indigo-400'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-indigo-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step >= 2 ? 'bg-white text-indigo-600 border-white' : 'border-indigo-400'}`}>2</div>
              <span className="text-sm font-medium">Admin Account</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile back button */}
          <button onClick={() => step === 1 ? navigate('/login') : setStep(1)}
            className="lg:hidden flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-6 transition-colors">
            ← {step === 1 ? 'Back to login' : 'Back'}
          </button>

          {step === 1 ? (
            <>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Tell us about your institution</h2>
              <p className="text-gray-500 text-sm mb-7">Step 1 of 2 — Basic details</p>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Institution type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {institutionTypes.map(t => (
                      <div key={t.id} onClick={() => setInstitutionType(t.id as any)}
                        className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all ${institutionType === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                        <div className="text-xl mb-1">{t.icon}</div>
                        <div className="text-xs font-semibold text-gray-800">{t.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Institution name <span className="text-red-500">*</span></label>
                  <input type="text" value={institutionName} onChange={e => setInstitutionName(e.target.value)}
                    placeholder="e.g. Delhi Public School, Sector 21" required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Official email</label>
                    <input type="email" value={institutionEmail} onChange={e => setInstitutionEmail(e.target.value)}
                      placeholder="info@school.edu"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                    <input type="tel" value={institutionPhone} onChange={e => setInstitutionPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Address</label>
                  <textarea value={institutionAddress} onChange={e => setInstitutionAddress(e.target.value)}
                    placeholder="Street, City, State, PIN"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all resize-none" />
                </div>

                <button type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all">
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">🏫</div>
                <span className="text-sm font-semibold text-indigo-700">{institutionName}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Create your admin account</h2>
              <p className="text-gray-500 text-sm mb-7">Step 2 of 2 — You'll manage the institution with this account</p>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Your full name <span className="text-red-500">*</span></label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma" required autoFocus
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Email address <span className="text-red-500">*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourdomain.com" required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Password <span className="text-red-500">*</span></label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters" required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Confirm password <span className="text-red-500">*</span></label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" required
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-all ${confirmPassword && password !== confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`} />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || (!!confirmPassword && password !== confirmPassword)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50">
                  {loading ? 'Creating account...' : 'Create account & continue →'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  By registering you agree to our terms of service. Your institution is created on the free demo plan.
                </p>
              </form>
            </>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-indigo-500 font-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
