import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Download, FileText, X, AlertCircle, CheckCircle2, Target, Eye, LayoutList } from 'lucide-react';
import type { MasterAspect } from '../../data/masterIndicators';

interface AssessmentMeta {
  id: string;
  year: string;
  tb: string;
  status: string;
  data: Record<string, any>;
  finalReportUrl?: string;
  finalReportName?: string;
}

interface TableData {
  id: string;
  name: string;
  bobot: number;
  skor: number;
  persen: number;
  kategori: string;
  kategoriColor: string;
}

export default function Report() {
  const { user } = useAuth();
  
  const [assessments, setAssessments] = useState<AssessmentMeta[]>([]);
  const [masterAspects, setMasterAspects] = useState<MasterAspect[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  const [previewFile, setPreviewFile] = useState<{name: string, fileData: string, tahun: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000'; // Untuk narik file dari storage

  const fetchData = async () => {
    const token = localStorage.getItem('gcg_token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

    try {
      // 1. Fetch Master Indicators
      const resMaster = await fetch(`${API_URL}/master-indicators`, { headers });
      if (resMaster.ok) {
        setMasterAspects(await resMaster.json());
      }

      // 2. Fetch Assessments
      const resAss = await fetch(`${API_URL}/assessments`, { headers });
      if (resAss.ok) {
        const allAss = await resAss.json();
        // Hanya tampilkan yang bukan Draft
        const filtered = allAss.filter((a: any) => a.status !== 'Draft');
        setAssessments(filtered);
        
        // Auto-select assessment pertama kalau belum ada yang dipilih
        if (filtered.length > 0 && !selectedAssessmentId) {
          setSelectedAssessmentId(filtered[0].id);
        }
      }
    } catch (e) {
      console.error("Gagal load data Laporan", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId);

  const getKategori = (persen: number) => {
    if (persen >= 85) return { label: 'Sangat Baik', color: 'text-emerald-700 bg-emerald-100' };
    if (persen >= 75) return { label: 'Baik', color: 'text-blue-700 bg-blue-100' };
    if (persen >= 60) return { label: 'Cukup Baik', color: 'text-amber-700 bg-amber-100' };
    return { label: 'Kurang', color: 'text-red-700 bg-red-100' };
  };

  // KALKULASI TABEL REKAPITULASI
  const tableData: TableData[] = useMemo(() => {
    if (!activeAssessment || !activeAssessment.data || masterAspects.length === 0) return [];

    return masterAspects.map(aspect => {
      const aspectData = activeAssessment.data[aspect.id] || [];
      let totalSkor = 0;
      
      aspectData.forEach((ind: any) => {
        totalSkor += (Number(ind.indicatorScore) || 0);
      });

      const bobot = Number(aspect.bobot || 0);
      const skor = Number(totalSkor.toFixed(3));
      const persen = bobot > 0 ? (skor / bobot) * 100 : 0;
      const kategori = getKategori(persen);

      return {
        id: aspect.id,
        name: aspect.name,
        bobot,
        skor,
        persen: Number(persen.toFixed(2)),
        kategori: kategori.label,
        kategoriColor: kategori.color
      };
    });
  }, [activeAssessment, masterAspects]);

  const totalBobot = tableData.reduce((sum, item) => sum + item.bobot, 0).toFixed(3);
  const totalSkor = tableData.reduce((sum, item) => sum + item.skor, 0).toFixed(3);
  const totalCapaianPersen = Number(totalBobot) > 0 ? ((Number(totalSkor) / Number(totalBobot)) * 100).toFixed(2) : "0.00";
  const totalKategori = getKategori(Number(totalCapaianPersen));

  // Fungsi Upload Laporan Final Menggunakan FormData
  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeAssessment) {
      const file = e.target.files[0];
      
      // Limit ukuran 10MB
      if (file.size > 10 * 1024 * 1024) {
        return alert("Gagal: Ukuran file laporan maksimal 10MB!");
      }

      setIsUploading(true);
      const token = localStorage.getItem('gcg_token');

      // Bungkus file pakai FormData
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_URL}/assessments/${activeAssessment.id}/upload-report`, {
          method: 'POST', 
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
            // Catatan: Jangan tambahkan 'Content-Type' saat menggunakan FormData
          },
          body: formData
        });

        if (res.ok) {
          await fetchData(); // Refresh data biar UI langsung terupdate
          alert('Laporan Final berhasil diunggah dan ditautkan ke Assessment!');
        } else {
          alert('Gagal mengunggah laporan ke server. Mungkin ada masalah validasi.');
        }
      } catch (err) {
        alert('Terjadi kesalahan jaringan saat mengunggah laporan.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full min-w-0 max-w-7xl mx-auto pb-10">
      
      {/* --- HEADER SECION --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <LayoutList className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Laporan & Rekapitulasi</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Tabel Rincian Penilaian dan Dokumen Final GCG</p>
          </div>
        </div>
      </div>
        
      {/* DROPDOWN DINAMIS */}
      <div className="relative max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
        <div className="relative">
          <select 
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer transition-all hover:bg-white"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
          >
            {assessments.length === 0 ? (
               <option value="">Belum ada data Assessment</option>
            ) : (
               assessments.map(ass => (
                 <option key={ass.id} value={ass.id}>
                   Assessment GCG TB {ass.year} - {ass.tb}
                 </option>
               ))
            )}
          </select>
          <div className="absolute right-4 top-4 w-6 h-6 bg-white rounded-md flex items-center justify-center border border-slate-200 pointer-events-none shadow-sm">
            <Target className="w-4 h-4 text-slate-500" strokeWidth={3}/>
          </div>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center animate-in fade-in flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6"><AlertCircle size={40} strokeWidth={1.5} /></div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Belum Ada Data Laporan</h2>
          <p className="text-slate-500 font-medium text-sm max-w-md">Laporan akan muncul setelah Assessment GCG diinisialisasi dan mulai diproses.</p>
        </div>
      ) : activeAssessment ? (
        <div className="space-y-8">
          
          {/* PANEL UPLOAD / DOKUMEN LAPORAN FINAL */}
          <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden relative border border-slate-800">
            <div className="absolute right-0 top-0 w-72 h-72 bg-indigo-500/20 blur-3xl rounded-full -mr-20 -mt-20"></div>
            <div className="p-8 relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-left w-full md:w-auto">
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/20 rounded-lg"><FileText className="text-indigo-400" size={20}/></div>
                  Dokumen Laporan Final
                </h2>
                <p className="text-slate-400 text-sm font-medium pl-11">Buku Laporan Komprehensif GCG Tahun {activeAssessment.year}</p>
                
                {activeAssessment.finalReportName && (
                  <div className="mt-5 ml-11 inline-flex items-center gap-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-xs font-bold shadow-inner">
                    <CheckCircle2 size={16} className="text-emerald-400" strokeWidth={2.5}/> 
                    <span className="truncate max-w-[200px] sm:max-w-xs">{activeAssessment.finalReportName}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto shrink-0">
                {/* Tombol Upload (Hanya untuk Auditor) */}
                {user?.role === 'auditor' && (
                  <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-95">
                    {isUploading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full"></div>
                    ) : (
                      <>
                        <Upload size={16} strokeWidth={2.5} className="text-indigo-400"/> {activeAssessment.finalReportUrl ? 'Perbarui Laporan' : 'Unggah Laporan PDF'}
                        <input type="file" accept=".pdf" className="hidden" onChange={handleUploadReport} disabled={isUploading} />
                      </>
                    )}
                  </label>
                )}

                {/* Tombol Lihat/Download */}
                {activeAssessment.finalReportUrl ? (
                  <button 
                    onClick={() => setPreviewFile({ 
                      name: activeAssessment.finalReportName!, 
                      fileData: `${BASE_URL}${activeAssessment.finalReportUrl}`, 
                      tahun: activeAssessment.year 
                    })}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-95"
                  >
                    <Eye size={16} strokeWidth={2.5}/> Pratinjau Dokumen
                  </button>
                ) : (
                  <div className="bg-slate-800/50 border border-slate-700/50 px-8 py-3.5 rounded-xl text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Dokumen Belum Tersedia</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABEL REKAPITULASI (Eks-Dashboard) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
                <Target size={18} className="text-indigo-600" strokeWidth={2.5}/> Rekapitulasi Penilaian GCG TB {activeAssessment.year}
              </h2>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-white text-slate-400 uppercase text-[10px] font-black tracking-widest border-b-2 border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center border-r border-slate-100">No</th>
                    <th className="px-6 py-4 border-r border-slate-100">Aspek Penilaian</th>
                    <th className="px-6 py-4 text-center border-r border-slate-100">Bobot (%)</th>
                    <th className="px-6 py-4 text-center text-indigo-600 border-r border-slate-100">Skor Capaian</th>
                    <th className="px-6 py-4 text-center w-32 border-r border-slate-100">Capaian (%)</th>
                    <th className="px-6 py-4 text-center w-40">Kategori</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-[12px]">
                  {tableData.map((row, idx) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 text-center font-bold text-slate-400 border-r border-slate-50">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 border-r border-slate-50 group-hover:text-indigo-600 transition-colors">{row.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500 border-r border-slate-50">{row.bobot.toFixed(3)}</td>
                      <td className="px-6 py-4 text-center font-black text-indigo-700 bg-indigo-50/50 border-r border-slate-50">{row.skor.toFixed(3)}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700 border-r border-slate-50">{row.persen}%</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/50 shadow-sm ${row.kategoriColor}`}>
                          {row.kategori}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest">
                  <tr>
                    <td colSpan={2} className="px-6 py-5 text-right border-r border-white/10">Skor Keseluruhan GCG</td>
                    <td className="px-6 py-5 text-center text-indigo-200 border-r border-white/10 text-sm">{totalBobot}</td>
                    <td className="px-6 py-5 text-center text-indigo-400 text-lg border-r border-white/10">{totalSkor}</td>
                    <td className="px-6 py-5 text-center text-emerald-400 text-lg border-r border-white/10">{totalCapaianPersen}%</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black ${totalKategori.color}`}>
                        {totalKategori.label}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      ) : null}

      {/* PREVIEW MODAL DOKUMEN */}
      {previewFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-300 border border-slate-200">
            <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0 shadow-lg relative z-10">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl"><FileText size={24} className="text-indigo-400" strokeWidth={2}/></div>
                <div>
                  <h2 className="text-sm font-black tracking-wide truncate max-w-lg leading-tight uppercase">{previewFile.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Laporan Final GCG TB {previewFile.tahun}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a href={previewFile.fileData} download={previewFile.name} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 border border-indigo-400/50">
                  <Download size={14} strokeWidth={3}/> Unduh Asli
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-2.5 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90 text-slate-400">
                  <X size={20} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
               {previewFile.fileData && previewFile.fileData.endsWith('.pdf') ? (
                 <iframe src={previewFile.fileData} title={previewFile.name} className="w-full h-full border-none rounded-2xl bg-white shadow-inner"/>
               ) : (
                 <div className="flex flex-col items-center justify-center p-12 text-center max-w-md bg-white rounded-3xl shadow-sm border border-slate-200">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6"><AlertCircle size={48} className="text-slate-300" strokeWidth={1.5} /></div>
                   <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full px-4">{previewFile.name}</h3>
                   <p className="text-slate-500 text-sm font-medium mb-8">Pratinjau langsung hanya didukung untuk format dokumen PDF.</p>
                   {previewFile.fileData && (
                    <a href={previewFile.fileData} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center gap-2">
                      <Download size={16} strokeWidth={3}/> Download File
                    </a>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}