import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, CheckCircle, Clock, AlertCircle, UploadCloud, Eye, Trash2, X, Download, Info } from 'lucide-react';
import type { EvidenceFile, DocumentRequest } from '../../types';

interface FileProps {
  evidences?: EvidenceFile[];
  setEvidences?: React.Dispatch<React.SetStateAction<EvidenceFile[]>>;
  documentRequests?: DocumentRequest[];
  setDocumentRequests?: React.Dispatch<React.SetStateAction<DocumentRequest[]>>;
}

export default function File(_props: FileProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<EvidenceFile | null>(null);
  
  const [dbEvidences, setDbEvidences] = useState<EvidenceFile[]>([]);
  const [dbRequests, setDbRequests] = useState<DocumentRequest[]>([]);
  const [dbAssessments, setDbAssessments] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  

  const fetchData = async () => {
    setIsLoading(true);
    const headers = {  'Accept': 'application/json' };
    try {
      const [resReq, resEv, resAss] = await Promise.all([
        fetchApi('/document-requests', { headers }),
        fetchApi('/evidences', { headers }),
        fetchApi('/assessments', { headers })
      ]);
      if (resReq.ok) setDbRequests(await resReq.json());
      if (resEv.ok) setDbEvidences(await resEv.json());
      if (resAss.ok) setDbAssessments(await resAss.json());
    } catch (e) { 
      console.error(e); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const visibleRequests = user?.role === 'auditee' ? dbRequests.filter(req => req.targetDivisi === user?.divisi) : dbRequests;
  
  const assessmentYearMap = new Map();
  dbAssessments.forEach(a => assessmentYearMap.set(String(a.id), String(a.year)));

  const getAssessmentYearOrFallback = (req: DocumentRequest) => {
    return assessmentYearMap.get(String(req.assessmentId)) || req.assessmentYear || req.assessmentId;
  };

  const uniqueYears = Array.from(new Set(visibleRequests.map(r => getAssessmentYearOrFallback(r)))).sort((a, b) => b.localeCompare(a));
  
  useEffect(() => {
    if (uniqueYears.length > 0 && !uniqueYears.includes(selectedYear)) {
      setSelectedYear(uniqueYears[0]);
    }
  }, [uniqueYears, selectedYear]);

  const requestsForSelectedYear = visibleRequests.filter(req => getAssessmentYearOrFallback(req) === selectedYear);
  const groupedRequests = requestsForSelectedYear.reduce((acc, req) => {
    const key = `Aspek ${req.aspectId} - Indikator ${req.indicatorId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(req);
    return acc;
  }, {} as Record<string, DocumentRequest[]>);

  const getFactorName = (req: DocumentRequest) => {
    if (!req.factorId) return null;
    const assessment = dbAssessments.find(a => String(a.id) === String(req.assessmentId));
    if (!assessment || !assessment.data) return null;
    const aspectData = assessment.data[req.aspectId];
    if (!aspectData) return null;
    const indicator = aspectData.find((i: any) => i.id === req.indicatorId);
    if (!indicator) return null;
    const parameter = indicator.parameters.find((p: any) => p.id === req.parameterId);
    if (!parameter) return null;
    const factor = parameter.factors.find((f: any) => f.id === req.factorId);
    return factor ? factor.name : null;
  };

  // 🆕 FUNGSI UPLOAD KE SERVER LARAVEL
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, req: DocumentRequest) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) return alert(`Gagal upload: Ukuran file maksimal 10MB.`);
      const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(file.type)) return alert(`Gagal upload: Format file tidak diizinkan! (Hanya PDF/Excel)`);

      setUploading(req.id);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', `EV-${Date.now()}`);
      formData.append('assessmentId', req.assessmentId);
      formData.append('assessmentYear', req.assessmentYear || '');
      formData.append('aspectId', req.aspectId);
      formData.append('indicatorId', req.indicatorId);
      formData.append('parameterId', req.parameterId);
      if (req.factorId) formData.append('factorId', req.factorId);
      formData.append('divisi', user?.divisi || 'Auditee');
      formData.append('uploadDate', new Date().toLocaleDateString('id-ID'));

      try {
        const res = await fetchApi('/evidences', {
          method: 'POST',
          // FormData gak butuh Content-Type
          body: formData
        });

        if (res.ok) {
          // Update Status Tagihan ke Uploaded
          await fetchApi(`/document-requests/${req.id}`, {
            method: 'PUT',
            headers: {  'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Uploaded', note: req.note })
          });
          fetchData(); // Refresh Layar
        } else {
          alert('Upload gagal diproses server.');
        }
      } catch (err) {
        alert('Koneksi terputus saat upload.');
      } finally {
        setUploading(null);
      }
    }
  };

  // 🆕 FUNGSI DELETE DARI SERVER LARAVEL
  const handleDeleteEvidence = async (evId: string, req: DocumentRequest) => {
    if (window.confirm("Yakin ingin menghapus dokumen ini dari server?")) {
      await fetchApi(`/evidences/${evId}`, { method: 'DELETE', });
      
      // Cek sisa file (ISOLASI FAKTOR)
      const remainingFiles = dbEvidences.filter(e => e.id !== evId && e.assessmentId === req.assessmentId && e.parameterId === req.parameterId && (e.factorId === req.factorId || (!e.factorId && !req.factorId)) && e.divisi === req.targetDivisi);
      if (remainingFiles.length === 0) {
        await fetchApi(`/document-requests/${req.id}`, {
          method: 'PUT',
          headers: {  'Content-Type': 'application/json' },
          body: JSON.stringify({ status: req.note ? 'Rejected' : 'Requested', note: req.note })
        });
      }
      fetchData(); // Refresh Layar
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full min-w-0 pb-10 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white shrink-0">
            <FileText className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Tagihan Dokumen</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-2">Pemenuhan Data Divisi: <span className="font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">{user?.divisi || 'Semua Entitas'}</span></p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
           <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-6"></div>
           <h2 className="text-xl font-black text-slate-800 mb-2">Memuat Tagihan Dokumen</h2>
           <p className="text-slate-500 font-medium text-sm">Harap tunggu sebentar, sedang sinkronisasi data dengan server...</p>
        </div>
      ) : uniqueYears.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
           <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-sm"><CheckCircle className="w-12 h-12 text-emerald-500/80" strokeWidth={2} /></div>
           <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Belum Ada Tagihan GCG</h2>
           <p className="text-slate-500 font-medium max-w-md">Keren! Saat ini tidak ada dokumen GCG yang ditagihkan oleh Tim Auditor ke divisi Anda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 overflow-hidden flex flex-col relative z-0">
          
          {/* TAB BAR TAHUN */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 pt-6 flex gap-3 overflow-x-auto custom-scrollbar relative z-10">
             {uniqueYears.map(year => (
               <button key={year} onClick={() => setSelectedYear(year)} className={`px-6 py-4 font-black text-xs uppercase tracking-widest rounded-t-2xl transition-all relative overflow-hidden ${selectedYear === year ? 'bg-white text-indigo-700 border-t border-x border-slate-100 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] z-10' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 border border-transparent'}`}>
                 <div className={`absolute top-0 left-0 w-full h-1 ${selectedYear === year ? 'bg-indigo-500' : 'bg-transparent'}`}></div>
                 <span>Tahun Buku {year}</span>
               </button>
             ))}
          </div>

          <div className="overflow-x-auto w-full text-left custom-scrollbar bg-white relative z-0">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-white border-b-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-5 w-1/2">Parameter & Berkas Dokumen</th>
                  <th className="px-6 py-5 w-48">PIC Auditor</th>
                  <th className="px-6 py-5 text-center w-40">Status Pengecekan</th>
                  <th className="px-6 py-5 text-center w-48">Aksi Upload</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {Object.entries(groupedRequests).map(([groupName, reqs]) => (
                  <React.Fragment key={groupName}>
                    {/* GROUP HEADER */}
                    <tr className="bg-indigo-50/50 border-b border-indigo-100/50">
                      <td colSpan={4} className="px-8 py-4 text-[10px] font-black text-indigo-800 uppercase tracking-widest">
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> {groupName}</div>
                      </td>
                    </tr>
                    
                    {/* ROWS */}
                    {reqs.map(req => {
                      const uploadedFiles = dbEvidences.filter(e => e.assessmentId === req.assessmentId && e.parameterId === req.parameterId && (e.factorId === req.factorId || (!e.factorId && !req.factorId)) && e.divisi === user?.divisi);
                      const factorName = getFactorName(req);
                      
                      return (
                        <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors align-top group">
                          <td className="px-8 py-6">
                            <div className="flex items-start gap-4 mb-4">
                              <span className="font-black text-slate-300 mt-1 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{req.parameterId}</span>
                              <div className="flex-1">
                                <p className="font-bold text-slate-800 leading-snug">{req.parameterName}</p>
                                {factorName && (
                                  <div className="mt-2 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg flex items-start gap-2 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
                                    <p className="text-xs font-semibold text-indigo-900 leading-tight"><span className="font-black text-[10px] uppercase tracking-widest text-indigo-500 block mb-0.5">Berlaku untuk Bukti Faktor:</span> {factorName}</p>
                                  </div>
                                )}
                                {req.note && req.status !== 'Rejected' && (
                                  <div className="mt-3 bg-amber-50 border border-amber-200/60 p-3.5 rounded-xl flex items-start gap-3 text-amber-800 shadow-sm animate-in fade-in relative overflow-hidden">
                                    <div className="absolute left-0 top-0 w-1 h-full bg-amber-500"></div>
                                    <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
                                    <div><p className="text-[9px] font-black uppercase tracking-widest mb-1 text-amber-600/80">Keterangan / Pesan Auditor:</p><p className="text-xs font-bold leading-relaxed">{req.note}</p></div>
                                  </div>
                                )}
                                {req.status === 'Rejected' && req.note && (
                                  <div className="mt-3 bg-rose-50 border border-rose-200/60 p-3.5 rounded-xl flex items-start gap-3 text-rose-700 shadow-sm animate-in fade-in relative overflow-hidden">
                                    <div className="absolute left-0 top-0 w-1 h-full bg-rose-500"></div>
                                    <Info size={16} className="shrink-0 mt-0.5 text-rose-500" />
                                    <div><p className="text-[9px] font-black uppercase tracking-widest mb-1 text-rose-500/80">Revisi / Penolakan Berkas:</p><p className="text-xs font-bold leading-relaxed">{req.note}</p></div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* UPLOADED FILES */}
                            {uploadedFiles.length > 0 && (
                              <div className="pl-12 space-y-2 mt-4 border-l-2 border-indigo-100/50 ml-3">
                                {uploadedFiles.map(file => (
                                  <div key={file.id} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors group/file">
                                    <div className="flex items-center gap-3 overflow-hidden pr-2">
                                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500 shrink-0"><FileText size={16} strokeWidth={2.5} /></div>
                                      <span className="text-xs font-bold text-slate-700 truncate">{file.fileName}</span>
                                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ml-auto shrink-0 border ${file.status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : file.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{file.status}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover/file:opacity-100 transition-opacity">
                                      <button onClick={() => setViewingDocument(file)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors tooltip" title="Lihat Dokumen"><Eye size={16} strokeWidth={2.5}/></button>
                                      {file.status !== 'Verified' && <button onClick={() => handleDeleteEvidence(file.id, req)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Hapus Dokumen"><Trash2 size={16} strokeWidth={2.5}/></button>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase border border-slate-200 shrink-0">{req.requestedBy?.charAt(0) || "?"}</div>
                              <div>
                                <p className="font-bold text-slate-700 text-sm">{req.requestedBy}</p>
                                <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1">{req.requestDate}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            {req.status === 'Requested' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 shadow-sm"><Clock size={12} strokeWidth={2.5}/> Belum Ada</span>}
                            {req.status === 'Uploaded' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200 shadow-sm"><Clock size={12} strokeWidth={2.5}/> Nunggu Cek</span>}
                            {req.status === 'Verified' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm"><CheckCircle size={12} strokeWidth={2.5}/> Selesai</span>}
                            {req.status === 'Rejected' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm animate-pulse"><AlertCircle size={12} strokeWidth={2.5}/> Revisi</span>}
                          </td>
                          <td className="px-6 py-6 text-center">
                            {req.status !== 'Verified' ? (
                              <label className={`inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest w-full transition-all cursor-pointer shadow-sm relative overflow-hidden ${uploading === req.id ? 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30 hover:shadow-lg active:scale-95 group/btn'}`}>
                                {uploading === req.id ? (
                                  <div className="flex gap-2 items-center"><div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></div> Mengunggah...</div>
                                ) : (
                                  <>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
                                    <UploadCloud size={16} strokeWidth={2.5} className="relative z-10"/> <span className="relative z-10 w-full text-center">Unggah Baru</span>
                                    <input type="file" className="hidden" accept=".pdf, .xls, .xlsx" onChange={(e) => handleUpload(e, req)} disabled={uploading === req.id}/>
                                  </>
                                )}
                              </label>
                            ) : (
                               <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 border border-slate-100"><CheckCircle className="text-emerald-400 w-6 h-6 mb-1" strokeWidth={2}/><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Terkunci</span></div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF VIEWER MODAL */}
      {viewingDocument && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-300 border border-slate-200">
            <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white shrink-0 shadow-lg relative z-10">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl"><FileText size={24} className="text-indigo-400" strokeWidth={2}/></div>
                <div>
                  <h2 className="text-sm font-black tracking-wide truncate max-w-lg leading-tight uppercase">{viewingDocument.fileName}</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Divisi Sumber: <span className="text-indigo-300">{viewingDocument.divisi}</span></p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {viewingDocument.fileUrl && (
                  <a href={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 border border-indigo-400/50">
                    <Download size={14} strokeWidth={3}/> Unduh Asli
                  </a>
                )}
                <button onClick={() => setViewingDocument(null)} className="p-2.5 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90 text-slate-400"><X size={20} strokeWidth={2.5}/></button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
               {viewingDocument.fileUrl && viewingDocument.fileUrl.endsWith('.pdf') ? (
                 <iframe src={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} title={viewingDocument.fileName} className="w-full h-full border-none rounded-2xl bg-white shadow-inner"/>
               ) : (
                 <div className="flex flex-col items-center justify-center p-12 text-center max-w-md bg-white rounded-3xl shadow-sm border border-slate-200">
                   <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6"><AlertCircle size={48} className="text-slate-300" strokeWidth={1.5}/></div>
                   <h3 className="text-xl font-black text-slate-800 mb-2 truncate w-full px-4">{viewingDocument.fileName}</h3>
                   <p className="text-slate-500 text-sm font-medium mb-8">Pratinjau langsung hanya didukung untuk format dokumen PDF. Silakan unduh untuk melihat konten selengkapnya.</p>
                   {viewingDocument.fileUrl && (
                    <a href={viewingDocument.fileUrl.replace(/^http:\/\//i, 'https://')} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center gap-2">
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