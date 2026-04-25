import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import LogoPeruri from '../../assets/LogoPeruri.png';
import BgImage from '../../assets/Baground.jpg';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulasi pengiriman email
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
    }, 1500);
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

      {/* Right Panel: Reset Password Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-8 lg:p-12 relative h-full overflow-y-auto bg-white">
        
        {/* Subtle mobile decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent"></div>

        <div className="flex-1 flex items-center justify-center w-full">
          <div className="max-w-md w-full relative z-10 animate-fade-in py-6">
            
            {submitted ? (
              /* --- STATE 2: SUKSES MENGIRIM EMAIL --- */
              <div className="flex flex-col items-center text-center animate-fade-in">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                    <div className="bg-gradient-to-b from-green-50 to-green-100 p-4 rounded-full relative border border-green-200">
                      <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">Email Terkirim!</h2>
                <p className="text-slate-500 text-xs sm:text-sm mb-8 leading-relaxed font-medium">
                  Instruksi pemulihan kata sandi telah dikirim ke <span className="font-bold text-slate-800">{email}</span>. Silakan periksa kotak masuk atau folder spam Anda.
                </p>
                <button
                  onClick={onBackToLogin}
                  className="w-full relative group overflow-hidden flex justify-center items-center py-3 px-4 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-600/30 transition-all uppercase tracking-widest"
                >
                  <span className="relative z-10">Back to Login</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>
              </div>
            ) : (
              /* --- STATE 1: FORM INPUT EMAIL --- */
              <div className="animate-fade-in">
                <div className="mb-6 flex flex-col items-center text-center">
                  <img src={LogoPeruri} alt="PERURI Logo" className="h-14 sm:h-25 w-auto mb-4 drop-shadow-sm" />
                  
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2 flex items-baseline justify-center gap-2">
                    Forgot Password
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
                    Masukkan email Anda untuk menerima tautan pemulihan kata sandi.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-indigo-600 transition-colors">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        // Perhatikan padding-nya gue ubah jadi px-4 biar normal lagi
                        className="block w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                        placeholder=""
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative group overflow-hidden flex justify-center items-center py-3 px-4 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-600/30 transition-all uppercase tracking-widest disabled:opacity-70 disabled:active:scale-100"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {loading ? 'Mengirim...' : 'Send Reset Link'}
                        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </button>

                    <button
                      type="button"
                      onClick={onBackToLogin}
                      className="w-full flex items-center justify-center space-x-2 pt-2 pb-1 text-[10px] sm:text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Back to Login</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>

        {/* Footer (Posisinya selalu di bawah layar/kontainer) */}
        <div className="text-center w-full mt-4 pb-2 relative z-10">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            © 2026 G-AS - Governance Assessment System.
          </p>
        </div>
        
      </div>
    </div>
  );
}