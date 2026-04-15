import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';

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

  if (submitted) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 opacity-90"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        <div className="w-full max-w-md relative z-10 bg-white rounded-3xl shadow-2xl p-10 text-center animate-fade-in border border-indigo-100">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="bg-gradient-to-b from-green-50 to-green-100 p-4 rounded-full relative border border-green-200">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Email Terkirim!</h2>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
            Instruksi pemulihan kata sandi telah dikirim ke <span className="font-bold text-slate-800">{email}</span>. Silakan periksa kotak masuk atau folder spam Anda.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
          >
            Kembali Ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 opacity-90"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-500 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md relative z-10 bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-indigo-100 animate-fade-in">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-indigo-50 p-4 rounded-2xl mb-5 text-indigo-600 border border-indigo-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reset Akses</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed">
            Masukkan email perusahaan Anda untuk menerima tautan pemulihan kata sandi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-indigo-600 transition-colors">
              Email Terdaftar
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none text-sm transition-all text-slate-800 font-semibold bg-slate-50 hover:bg-slate-100 focus:bg-white"
                placeholder="nama@perusahaan.com"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-70 active:scale-[0.98]"
            >
              {loading ? 'Mengirim...' : 'Kirim Instruksi'}
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full flex items-center justify-center space-x-2 pt-2 pb-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali Ke Login</span>
          </button>
        </form>
      </div>
    </div>
  );
}