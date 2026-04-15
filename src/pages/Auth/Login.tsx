import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
  onForgotPassword: () => void;
}

export default function Login({ onForgotPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Panel: Branding & Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-950 items-center justify-center">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-900 to-slate-900 opacity-90"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Floating Abstract Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 p-16 text-white max-w-xl animate-fade-in flex flex-col justify-center h-full">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-10 border border-white/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <ShieldCheck className="w-12 h-12 text-indigo-300 drop-shadow-lg" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
            Sistem Penilaian<br/>& Monitoring GCG
          </h1>
          <p className="text-indigo-200/80 text-lg font-medium leading-relaxed mb-12 max-w-md">
            Platform terintegrasi untuk mewujudkan tata kelola perusahaan yang transparan, akuntabel, independen, dan dikelola secara profesional.
          </p>
          
          <div className="mt-auto flex items-center gap-4 text-sm font-bold text-indigo-300/60 uppercase tracking-widest">
            <span className="w-10 h-[2px] bg-indigo-500/50 rounded-full"></span>
            Badan Publik Terpercaya
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative overflow-hidden bg-white">
        {/* Subtle mobile decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent"></div>
        <div className="lg:hidden absolute top-6 flex justify-center w-full">
          <ShieldCheck className="w-12 h-12 text-indigo-600 drop-shadow-md" />
        </div>

        <div className="max-w-md w-full relative z-10 animate-fade-in lg:mt-0 mt-16">
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Selamat Datang</h2>
            <p className="text-slate-500 font-medium">Silakan masuk menggunakan akun perusahaan Anda.</p>
          </div>

          <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start shadow-sm shadow-indigo-100/50">
            <div className="mt-0.5 p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
               <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-1">Akses Terbatas</p>
              <p className="text-xs text-indigo-700/80 leading-relaxed font-medium">
                Hanya pengguna yang sah yang diizinkan masuk. Seluruh aktivitas terekam dalam Audit Trail.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200 flex items-center gap-3 animate-fade-in shadow-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="group">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Email Perusahaan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">Kata Sandi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center text-slate-600 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 transition-all" />
                <span className="ml-3 font-semibold text-sm group-hover:text-slate-900 transition-colors">Ingat Saya</span>
              </label>
              <button type="button" onClick={onForgotPassword} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Lupa Sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden flex justify-center items-center py-4 px-4 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/30 transition-all uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? 'Memverifikasi...' : 'Masuk Sistem'}
                {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
          </form>
          
          <div className="mt-12 text-center lg:text-left">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
              G-AS © {new Date().getFullYear()} Hak Cipta Dilindungi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
