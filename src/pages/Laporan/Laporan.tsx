import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Download, FileText, X, AlertCircle, CheckCircle2, Target, Eye, LayoutList, ChevronDown } from 'lucide-react';
import type { MasterAspect } from '../../data/masterIndicators';
import { calculateGCGData } from '../../utils/gcgCalculator';

interface AssessmentMeta {
  id: string;
  year: string;
  tb: string;
  status: string;
  data: Record<string, any>;
  finalReportUrl?: string;
  finalReportName?: string;
}

export default function Report() {
  const { user } = useAuth();
  
  const [assessments, setAssessments] = useState<AssessmentMeta[]>([]);
  const [masterAspects, setMasterAspects] = useState<MasterAspect[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  const [previewFile, setPreviewFile] = useState<{name: string, fileData: string, tahun: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000'; // Untuk narik file dari storage

  const fetchData = async () => {
    const headers = {  'Accept': 'application/json' };

    try {
      // 1. Fetch Master Indicators
      const resMaster = await fetchApi('/master-indicators', { headers });
      if (resMaster.ok) {
        setMasterAspects(await resMaster.json());
      }

      // 2. Fetch Assessments
      const resAss = await fetchApi('/assessments', { headers });
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

  const {
    mainAspects: tableData,
    modifierAspects,
    totalBobot,
    totalSkorNow: totalSkor,
    totalPersenNow: totalCapaianPersen
  } = useMemo(() => calculateGCGData(activeAssessment, null, masterAspects), [activeAssessment, masterAspects]);

  // Fungsi Upload Laporan Final Menggunakan FormData
  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeAssessment) {
      const file = e.target.files[0];
      
      // Limit ukuran 10MB
      if (file.size > 10 * 1024 * 1024) {
        return alert("Gagal: Ukuran file laporan maksimal 10MB!");
      }

      setIsUploading(true);
      // Bungkus file pakai FormData
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetchApi(`/assessments/${activeAssessment.id}/upload-report`, {
          method: 'POST', 
          headers: {
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
    <div className="space-y-6 animate-in fade-in duration-500 w-full min-w-0 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* HEADER & DROPDOWN (Standardized UI) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
            <LayoutList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Laporan & Rekapitulasi</h1>
            <p className="text-sm font-medium text-slate-500">Tabel Rincian Penilaian dan Dokumen Final GCG</p>
          </div>
        </div>

        <div className="w-full md:w-80 relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <select 
            className="w-full appearance-none bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
          >
            {assessments.length === 0 ? (
               <option value="">Belum ada data Assessment</option>
            ) : (
               assessments.map(ass => (
                 <option key={ass.id} value={ass.id}>
                   Dashboard TB {ass.year} - {ass.tb}
                 </option>
               ))
            )}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-16 text-center animate-in fade-in flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4"><AlertCircle size={32} strokeWidth={1.5} /></div>
          <h2 className="text-lg font-black text-slate-800 mb-1.5">Belum Ada Data Laporan</h2>
          <p className="text-slate-500 font-medium text-sm max-w-md">Laporan akan muncul setelah Assessment GCG diinisialisasi dan mulai diproses.</p>
        </div>
      ) : activeAssessment ? (
        <div className="space-y-6">
          
          {/* PANEL UPLOAD / DOKUMEN LAPORAN FINAL (Compact Dark Panel) */}
          <div className="bg-slate-900 rounded-2xl shadow-md overflow-hidden relative border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 p-6">
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="text-left w-full md:w-auto relative z-10 flex items-start gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-xl shrink-0">
                <FileText className="text-indigo-400" size={24}/>
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight leading-none mb-1">
                  Dokumen Laporan Final
                </h2>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Buku Laporan Komprehensif GCG TB {activeAssessment.year}</p>
                
                {activeAssessment.finalReportName && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-inner">
                    <CheckCircle2 size={14} className="text-emerald-400" strokeWidth={2.5}/> 
                    <span className="truncate max-w-[200px] sm:max-w-xs">{activeAssessment.finalReportName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 relative z-10">
              {/* Tombol Upload (Hanya untuk Auditor) */}
              {user?.role === 'auditor' && (
                <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95">
                  {isUploading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <Upload size={16} strokeWidth={2}/> {activeAssessment.finalReportUrl ? 'Perbarui File' : 'Unggah PDF'}
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <Eye size={16} strokeWidth={2}/> Pratinjau Dokumen
                </button>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700/50 px-5 py-2.5 rounded-xl text-center flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={14}/> Belum Tersedia
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* TABEL REKAPITULASI */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2.5">
                <Target size={16} className="text-indigo-600" strokeWidth={2.5}/> Rekapitulasi Penilaian GCG TB {activeAssessment.year}
              </h2>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-white text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 w-12 text-center border-r border-slate-100">No</th>
                    <th className="px-5 py-3 border-r border-slate-100">Aspek Penilaian</th>
                    <th className="px-5 py-3 text-center border-r border-slate-100 w-32">Bobot (%)</th>
                    <th className="px-5 py-3 text-center text-indigo-600 border-r border-slate-100 w-32">Skor Capaian</th>
                    <th className="px-5 py-3 text-center w-32">Capaian (%)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-sm">
                  {/* ASPEK UTAMA */}
                  {tableData.map((row, idx) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                      <td className="px-5 py-3 font-bold text-slate-800 border-r border-slate-100">{row.name}</td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-500 border-r border-slate-100">{row.bobot.toFixed(3)}</td>
                      <td className="px-5 py-3 text-center font-black text-indigo-600 bg-indigo-50/30 border-r border-slate-100">{row.skorNow.toFixed(3)}</td>
                      <td className="px-5 py-3 text-center font-bold text-slate-700 border-r border-slate-100">{row.persenNow.toFixed(2)}%</td>
                    </tr>
                  ))}
                  
                  {/* ASPEK PENYESUAI */}
                  {modifierAspects.map((row, idx) => (
                    <tr key={row.id} className={`border-b transition-colors ${row.isBonusActive ? 'bg-orange-50/30' : 'bg-slate-50 opacity-60'}`}>
                      <td className="px-5 py-3 text-center font-bold text-orange-400 border-r border-slate-100">{tableData.length + idx + 1}</td>
                      <td className="px-5 py-3 font-bold text-orange-700 border-r border-slate-100">
                         {row.name}
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-orange-500 border-r border-slate-100">&plusmn; {row.bobot.toFixed(3)}</td>
                      <td className={`px-5 py-3 text-center font-black bg-orange-50/50 border-r border-slate-100 ${row.skorNow > 0 ? 'text-emerald-600' : row.skorNow < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {row.skorNow > 0 ? '+' : ''}{row.skorNow.toFixed(3)}
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-orange-600 bg-orange-50/50">{row.persenNow.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-widest">
                  <tr>
                    <td colSpan={2} className="px-5 py-4 text-right border-r border-slate-700">Skor Keseluruhan GCG</td>
                    <td className="px-5 py-4 text-center text-slate-300 border-r border-slate-700">{totalBobot.toFixed(3)}</td>
                    <td className="px-5 py-4 text-center text-indigo-400 text-base border-r border-slate-700">{totalSkor.toFixed(3)}</td>
                    <td className="px-5 py-4 text-center text-emerald-400 text-base">{totalCapaianPersen.toFixed(2)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      ) : null}

      {/* PREVIEW MODAL DOKUMEN */}
      {previewFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-200 border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg"><FileText size={20} className="text-indigo-400" strokeWidth={2}/></div>
                <div>
                  <h2 className="text-sm font-bold tracking-wide truncate max-w-lg leading-tight uppercase">{previewFile.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Laporan Final GCG TB {previewFile.tahun}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <a href={previewFile.fileData.replace(/^http:\/\//i, 'https://')} download={previewFile.name} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-colors hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 border border-indigo-500">
                  <Download size={14} strokeWidth={2.5}/> Unduh Asli
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-2 bg-slate-800 hover:bg-rose-500 hover:text-white rounded-lg transition-colors active:scale-95 text-slate-300">
                  <X size={18} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
               {previewFile.fileData && previewFile.fileData.endsWith('.pdf') ? (
                 <iframe src={previewFile.fileData.replace(/^http:\/\//i, 'https://')} title={previewFile.name} className="w-full h-full border-none rounded-xl bg-white shadow-sm"/>
               ) : (
                 <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4"><AlertCircle size={40} className="text-slate-300" strokeWidth={1.5} /></div>
                   <h3 className="text-base font-bold text-slate-800 mb-2 truncate w-full px-4">{previewFile.name}</h3>
                   <p className="text-slate-500 text-xs font-medium mb-6">Pratinjau langsung hanya didukung untuk format dokumen PDF.</p>
                   {previewFile.fileData && (
                    <a href={previewFile.fileData.replace(/^http:\/\//i, 'https://')} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors hover:bg-indigo-700 active:scale-95 flex items-center gap-2 shadow-sm">
                      <Download size={16} strokeWidth={2.5}/> Download File
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