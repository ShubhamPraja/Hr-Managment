'use client';


import React, { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useRouter } from '../hooks/use-navigation';

const Login: React.FC = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (result.success) {
      router.push('/');
    } else {
      setError(result.message || 'Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>

      <div className="w-full max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-200 mb-4">Z</div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ZingHR <span className="text-blue-600">Enterprise</span></h1>
          <p className="text-slate-500 font-medium">Global Workforce Solutions</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Work Email</label>
            <input 
              required
              type="email"
              placeholder="name@company.com"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
            <input 
              required
              type="password"
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-900 font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={isLoading}
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
          <button 
            onClick={() => router.push('/register')}
            className="text-blue-600 font-bold text-sm hover:underline underline-offset-4"
          >
            Don't have an account? Register Now
          </button>
          <div className="flex justify-between w-full text-xs font-bold text-slate-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Forgot Password?</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
