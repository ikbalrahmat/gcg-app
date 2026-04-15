import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types'; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // URL API Laravel lu
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  useEffect(() => {
    // Pas web direfresh, kita tetep baca user dari localStorage biar ga login ulang
    const savedUser = localStorage.getItem('gcg_active_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Nembak API Login Laravel
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', // Wajib biar dapet balikan JSON, bukan error HTML
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // Kalau response dari server bukan 200 OK (misal password salah)
      if (!response.ok) {
        return { error: data.message || 'Email atau password salah.' };
      }

      // Kalau sukses, simpan data user & token Sanctum
      setUser(data.user);
      localStorage.setItem('gcg_active_user', JSON.stringify(data.user));
      localStorage.setItem('gcg_token', data.access_token); // Tiket API lu disimpen di sini

      return { error: null };
    } catch (err) {
      return { error: 'Tidak dapat terhubung ke server. Pastikan API menyala.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
    const token = localStorage.getItem('gcg_token');
    
    // Nembak API Logout ke server biar tokennya dimatikan di database
    if (token) {
      try {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`, // Bawa tiketnya
            'Accept': 'application/json',
          },
        });
      } catch (err) {
        console.error('Gagal mematikan sesi di server:', err);
      }
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