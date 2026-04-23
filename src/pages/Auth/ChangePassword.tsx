import React, { useState } from 'react';
import { fetchApi } from '../../utils/api';
import { ShieldAlert, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import type { User } from '../../types';
import LogoPeruri from '../../assets/LogoPeruri.png';
import BgImage from '../../assets/Baground.jpg';

interface ChangePasswordProps {
  onSuccess: (updatedUser: User) => void;
}

export default function ChangePassword({ onSuccess }: ChangePasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State untuk toggle icon mata (show/hide password)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi('/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Gagal memperbarui sandi.');
        setLoading(false);
        return;
      }

      onSuccess(data.user);
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Pastikan server menyala.');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-slate-50 font-sans overflow-hidden">
      
      {/* Left Panel: Branding & Decorative (Sama persis dengan Login) */}
      <div className="hidden lg:flex lg:w-1/2 relative h-full items-center justify-center" style={{backgroundImage: `url(${BgImage})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-violet-900/30 to-slate-900/30"></div>

        <div className="relative z-10 p-12 xl:p-16 text-white max-w-xl animate-fade-in flex flex-col justify-center h-full">
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black mb-6 leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
            Sistem Penilaian<br/>& Monitoring GCG
          </h1>
          <p className="text-indigo-200/80 text-base xl:text-lg font-medium leading-relaxed mb-12 max-w-md">
            Platform terintegrasi untuk mewujudkan tata kelola perusahaan yang transparan, akuntabel, independen, dan dikelola secara profesional.
          </p>
        </div>
      </div>

      {/* Right Panel: Change Password Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-8 lg:p-12 relative h-full overflow-y-auto bg-white">
        
        {/* Subtle mobile decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent"></div>

        <div className="flex-1 flex items-center justify-center w-full">
          <div className="max-w-md w-full relative z-10 animate-fade-in py-6">
            
            {/* HEADER & LOGO */}
            <div className="mb-6 flex flex-col items-center text-center">
              <img src={LogoPeruri} alt="PERURI Logo" className="h-14 sm:h-25 w-auto mb-4 drop-shadow-sm" />
              
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2 flex items-baseline justify-center gap-2">
                Pembaruan Keamanan
              </h2>
              
              {/* Logo G-AS Kecil sebagai Aksen */}
              <span className="relative inline-flex flex-col items-center translate-y-0.5 mb-3">
                <span className="text-lg sm:text-xl tracking-tight">
                  <span className="text-indigo-600">G</span>
                  <span className="text-slate-800">-</span>
                  <span className="text-slate-800">AS</span>
                </span>
                <span className="absolute -bottom-1 w-4 h-[2px] bg-violet-500 rounded-full"></span>
              </span>

              <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-relaxed mt-1 max-w-[280px]">
                Anda diwajibkan untuk memperbarui kata sandi Anda demi keamanan akun.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs sm:text-sm font-bold flex gap-3 items-center animate-fade-in shadow-sm">
                  <ShieldAlert size={16} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-indigo-600 transition-colors">
                    Password Baru
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-10 py-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                      placeholder="Minimal 8 karakter"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-indigo-600 transition-colors">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-11 pr-10 py-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                      placeholder="Ulangi password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* INFO SYARAT PASSWORD (COMPACT) */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm shadow-indigo-100/30 mt-2">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-2">Syarat Password:</p>
                <ul className="text-[11px] text-indigo-700 space-y-1.5 font-medium flex flex-col gap-1">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Minimal 8 karakter</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Huruf besar & kecil (A-z, a-z)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Kolaborasi angka & simbol</li>
                  <li className="flex items-start gap-2 text-rose-600 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></div> Tidak boleh sama dengan 3 sandi terakhir</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden flex justify-center items-center py-3 px-4 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-600/30 transition-all uppercase tracking-widest disabled:opacity-70 disabled:active:scale-100"
                >
                  <span className="relative z-10">{loading ? 'Memproses...' : 'Simpan Password Baru'}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>
              </div>
            </form>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center w-full mt-4 pb-2 relative z-10">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            G-AS © 2026
          </p>
        </div>
        
      </div>
    </div>
  );
}