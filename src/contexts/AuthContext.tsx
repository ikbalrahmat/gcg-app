import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types'; 
import { fetchApi, fetchCsrfCookie } from '../utils/api'; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // URL API Laravel lu
  

  useEffect(() => {
    // Pas web direfresh, kita tetep baca user dari localStorage biar ga login ulang
    const savedUser = localStorage.getItem('gcg_active_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string, captchaToken: string) => {
    try {
      // 🆕 WAJIB: Ambil CSRF Cookie dulu dari Laravel sblm Login (Sanctum SPA Rules)
      await fetchCsrfCookie();

      // Nembak API Login (Pakai wrapper baru)
      const response = await fetchApi('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, captcha_token: captchaToken }),
      });

      const data = await response.json();

      // Kalau response dari server bukan 200 OK (misal password salah)
      if (!response.ok) {
        return { error: data.message || 'Email atau password salah.' };
      }

      // Kalau sukses, simpan data user dan set kembali tiket token (Fallback dari Cookie SPA krn Railway CORS)
      setUser(data.user);
      localStorage.setItem('gcg_active_user', JSON.stringify(data.user));
      
      if (data.access_token) {
        localStorage.setItem('gcg_token', data.access_token);
      }

      return { error: null };
    } catch (err) {
      return { error: 'Tidak dapat terhubung ke server. Pastikan API menyala.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await fetchCsrfCookie();
      const response = await fetchApi('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name: fullName }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.message || 'Gagal mendaftar.' };
      }
      return { error: null };
    } catch (err) {
      return { error: 'Tidak dapat terhubung ke server.' };
    }
  };

  const signOut = async () => {
    // Nembak API Logout ke server (Cookie akan dikirim otomatis)
    try {
      await fetchApi('/logout', {
        method: 'POST'
      });
    } catch (err) {
      console.error('Gagal mematikan sesi di server:', err);
    }

    // Hapus sesi di sisi frontend
    setUser(null);
    localStorage.removeItem('gcg_active_user');
    localStorage.removeItem('gcg_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}