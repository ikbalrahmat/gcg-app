// Tipe data khusus untuk Role dan Level
export type UserRole = 'super_admin' | 'auditor' | 'auditee' | 'manajemen' | 'admin_spi';
export type AuditorLevel = 'Anggota' | 'Ketua Tim' | 'Pengendali Teknis';

// Tipe data User lengkap
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  level?: AuditorLevel;
  divisi?: string;
  is_first_login?: boolean;
  is_locked?: boolean; // 🆕 TAMBAH INI BIAR BISA DIBACA REACT
}

export interface EvidenceFile {
  id: string;
  assessmentId: string; 
  assessmentYear?: string;
  aspectId: string;
  indicatorId: string;
  parameterId: string;
  factorId?: string;
  fileName: string;
  divisi: string;
  uploadDate: string;
  status: 'Menunggu Verifikasi' | 'Verified' | 'Rejected';
  fileUrl?: string; 
}

export interface DocumentRequest {
  id: string;
  assessmentId: string;
  assessmentYear?: string;
  aspectId: string;
  indicatorId: string;
  parameterId: string;
  factorId?: string;
  parameterName: string;
  targetDivisi: string; 
  requestedBy: string;  
  requestDate: string;
  status: 'Requested' | 'Uploaded' | 'Verified' | 'Rejected';
  note?: string; 
}