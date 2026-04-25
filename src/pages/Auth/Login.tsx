import React, { useState, useEffect } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ReCAPTCHA from "react-google-recaptcha";
import LogoPeruri from '../../assets/LogoPeruri.png';
import BgImage from '../../assets/Baground.jpg';

interface LoginProps {
  onForgotPassword: () => void;
}

export default function Login({ onForgotPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  useEffect(() => {
    let timer: number | undefined;
    if (lockoutTimer > 0) {
      timer = window.setInterval(() => setLockoutTimer(prev => prev - 1), 1000);
    } else if (lockoutTimer === 0 && failedAttempts >= 3) {
      setFailedAttempts(0); // Reset kegagalan jika waktu tunggu selesal
    }
    return () => clearInterval(timer);
  }, [lockoutTimer, failedAttempts]);
  
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return; // Mencegah submit saat terkunci
    
    if (!captchaToken) {
      setError("Verifikasi bahwa Anda bukan robot sebelum melanjutkan.");
      return;
    }

    setIsLoading(true);
    setError('');

    // Kirim kredensial dan captchaToken
    const result = await signIn(email, password, captchaToken);
    
    if (result.error) {
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      
      if (newFails >= 3) {
        setLockoutTimer(60); // Paksa kunci selama 60 detik
        setError('Akses ditutup sementara karena spam. Silakan tunggu 60 detik.');
      } else {
         setError(result.error);
      }
      setIsLoading(false);
    } else {
        setFailedAttempts(0); // Reset sukses
    }
  };

  return (
    <div className="h-screen flex bg-slate-50 font-sans overflow-hidden">
      
      {/* Left Panel: Branding & Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative h-full items-center justify-center" style={{backgroundImage: `url(${BgImage})`, backgroundSize: 'cover', backgroundPosition: 'center'}}>
        {/* Overlay untuk kontras */}
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

      {/* Right Panel: Login Form */}
      {/* Ubah flex layout menjadi col supaya footer bisa didorong ke bawah */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 sm:p-8 lg:p-12 relative h-full overflow-y-auto bg-white">
        
        {/* Subtle mobile decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent"></div>

        {/* Wadah Form (flex-1 akan mengisi seluruh ruang kosong dan mendorong footer ke paling bawah) */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="max-w-md w-full relative z-10 animate-fade-in py-6">
            
            {/* Logo & Welcome Text Section */}
            <div className="mb-6 flex flex-col items-center text-center">
              {/* Logo Peruri */}
              <img src={LogoPeruri} alt="PERURI Logo" className="h-14 sm:h-25 w-auto mb-3 drop-shadow-sm" />
              
              {/* Welcome to + Logo G-AS Custom Color */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2 flex items-baseline justify-center gap-2">
                Welcome to 
                <span className="relative inline-flex flex-col items-center translate-y-1">
                  <span className="text-2xl sm:text-3xl tracking-tight">
                    <span className="text-indigo-600">G</span>
                    <span className="text-slate-800">-</span>
                    <span className="text-slate-800">AS</span>
                  </span>
                  <span className="absolute -bottom-1 w-5 h-[3px] bg-violet-500 rounded-full"></span>
                </span>
              </h2>

              <p className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                Governance Assessment System
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-bold border border-red-200 flex items-center gap-3 animate-fade-in shadow-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-focus-within:text-indigo-600 transition-colors">Email</label>
                  <input
                    type="email"
                    required
                    className="block w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                    placeholder=""
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 transition-colors">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full px-4 py-3 pr-10 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white placeholder:font-normal placeholder:text-slate-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden relative z-0"
                      placeholder=""
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none pointer-events-auto opacity-100 z-10 bg-transparent flex items-center justify-center p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center text-slate-600 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 transition-all" />
                  <span className="ml-2.5 font-semibold text-xs sm:text-sm group-hover:text-slate-900 transition-colors">Remember me</span>
                </label>
                <button type="button" onClick={onForgotPassword} className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Forgot Password?
                </button>
              </div>

              <div className="flex justify-center border-t border-b py-2 border-slate-100 my-2">
                 <ReCAPTCHA
                   sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ""}
                   onChange={(token) => setCaptchaToken(token)}
                   className="transform scale-90 sm:scale-100 origin-center"
                 />
              </div>

              <button
                type="submit"
                disabled={isLoading || lockoutTimer > 0}
                className={`w-full relative group overflow-hidden flex justify-center items-center py-3 px-4 rounded-xl text-sm font-black text-white ${lockoutTimer > 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-[0.98]'} focus:outline-none focus:ring-4 focus:ring-indigo-600/30 transition-all uppercase tracking-widest disabled:opacity-70 disabled:active:scale-100`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? 'Memverifikasi...' : lockoutTimer > 0 ? `Dimoderasi (${lockoutTimer}s)` : 'Log in'}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </button>
            </form>
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