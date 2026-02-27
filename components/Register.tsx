'use client';


import React, { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useRouter } from '../hooks/use-navigation';

const Register: React.FC = () => {
  const { register } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await register(
      formData.name, 
      formData.email, 
      formData.password, 
      formData.organizationName
    );
    
    if (result.success) {
      router.push('/');
    } else {
      setError(result.message || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-blue-100 rounded-full blur-3xl opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-100 rounded-full blur-3xl opacity-40 animate-pulse"></div>

      <div className="w-full max-w-xl p-10 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-200 mb-6 transition-transform hover:scale-110">Z</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">Register Your <span className="text-blue-600">Company</span></h1>
          <p className="text-slate-500 font-medium text-center mt-2">Start managing your global workforce with ZingHR Clone.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Organization Details</label>
            <input 
              required
              type="text"
              placeholder="Your Company Name (e.g. Acme Corp)"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-900 font-semibold"
              value={formData.organizationName}
              onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Admin Full Name</label>
              <input 
                required
                type="text"
                placeholder="John Doe"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-900 font-semibold"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
              <input 
                required
                type="email"
                placeholder="admin@company.com"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-900 font-semibold"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
            <input 
              required
              type="password"
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-900 font-semibold"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl flex gap-3 items-start border border-blue-100">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              By registering, you become the **Primary Admin**. You can later create credentials for your HR team and Employees from the management dashboard.
            </p>
          </div>

          <button 
            disabled={isLoading}
            type="submit"
            className="w-full py-5 bg-blue-600 text-white rounded-[1.25rem] font-black text-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Setup My Workspace'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500 font-bold">Already part of a company?</p>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 font-black hover:underline underline-offset-8 decoration-2"
          >
            Sign in to Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
