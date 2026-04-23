import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { UploadCloud, XCircle, CheckCircle2, FileWarning, Target, TrendingUp, TrendingDown, Minus, RefreshCw, Info } from 'lucide-react';
import type { MasterAspect } from '../../data/masterIndicators';
import { calculateGCGData } from '../../utils/gcgCalculator';

interface AssessmentMeta {
  id: string;
  year: string;
  tb: string;
  status: string;
  data: Record<string, any>;
}

export default function AuditeeDashboard() {
  const { user } = useAuth();
  
  const [dbRequests, setDbRequests] = useState<any[]>([]);
  const [dbEvidences, setDbEvidences] = useState<any[]>([]);
  
  // State untuk Inline Loading
  const [isSyncing, setIsSyncing] = useState(false);

  const [assessments, setAssessments] = useState<AssessmentMeta[]>([]);
  const [masterAspects, setMasterAspects] = useState<MasterAspect[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setIsSyncing(true); // Mulai loading inline
      const headers = {  'Accept': 'application/json' };

      try {
        if (user) {
          // 1. Fetch Document Requests
          const resReq = await fetchApi('/document-requests', { headers });
          if (resReq.ok) {
            const resData = await resReq.json();
            const reqData = Array.isArray(resData) ? resData : (resData.data || []);
            setDbRequests(reqData);
          }

          // 2. Fetch Evidences
          const resEvi = await fetchApi('/evidences', { headers });
          if (resEvi.ok) {
            const resData = await resEvi.json();
            const eviData = Array.isArray(resData) ? resData : (resData.data || []);
            setDbEvidences(eviData);
          }
        }

        // 3. Load Data Assessment & Master untuk Tabel YoY
        const resMaster = await fetchApi('/master-indicators', { headers });
        if (resMaster.ok) {
          const resData = await resMaster.json();
          setMasterAspects(Array.isArray(resData) ? resData : (resData.data || []));
        }

        const resAss = await fetchApi('/assessments', { headers });
        if (resAss.ok) {
          const resData = await resAss.json();
          const allAss = Array.isArray(resData) ? resData : (resData.data || []);
          if (Array.isArray(allAss)) {
            const filtered = allAss.filter((a: any) => a.status !== 'Draft');
            filtered.sort((a: any, b: any) => Number(b.year) - Number(a.year));
            setAssessments(filtered);
            if (filtered.length > 0 && !selectedAssessmentId) {
              setSelectedAssessmentId(filtered[0].id);
            }
          }
        }

      } catch (error) {
        console.error("Gagal load data", error);
      } finally {
        // Delay dikit biar transisi loadingnya elegan
        setTimeout(() => setIsSyncing(false), 500);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedAssessmentId]); // Fetch saat user atau assessment ganti

  const stats = useMemo(() => {
    let needUpload = 0, rejected = 0, approved = 0;
    if (!selectedAssessmentId) return { needUpload, rejected, approved };
    
    const myDivisi = (user?.divisi || '').toLowerCase().trim();

    // Reqs
    const assReqs = dbRequests.filter(r => r.assessmentId === selectedAssessmentId);
    needUpload = assReqs.filter(r => {
      const target = (r.targetDivisi || '').toLowerCase().trim();
      return (r.status === 'Requested' || r.status === 'Open') && (myDivisi === '' || target.includes(myDivisi));
    }).length;

    // Evis
    const assEvis = dbEvidences.filter(e => e.assessmentId === selectedAssessmentId);
    const myEvis = assEvis.filter(e => {
       const uploaderDivisi = (e.divisi || '').toLowerCase().trim();
       return myDivisi === '' || uploaderDivisi.includes(myDivisi);
    });
    rejected = myEvis.filter(e => e.status === 'Rejected' || e.status === 'Revisi' || e.status === 'Ditolak').length;
    approved = myEvis.filter(e => e.status === 'Verified' || e.status === 'Approved').length;

    return { needUpload, rejected, approved };
  }, [dbRequests, dbEvidences, selectedAssessmentId, user]);

  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId);
  const prevAssessment = useMemo(() => {
    if (!activeAssessment) return null;
    const targetYear = String(Number(activeAssessment.year) - 1);
    return assessments.find(a => a.year === targetYear && a.status !== 'Draft');
  }, [activeAssessment, assessments]);

  // Kalkulasi data GCG dengan nilai default jika data kosong/loading
  const gcgData = useMemo(() => {
    if (!activeAssessment) {
      return {
        mainAspects: [], modifierAspects: [], totalBobot: 0, totalSkorNow: 0, totalPersenNow: 0,
        predikatNow: { label: '-', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
        totalSkorPrev: 0, totalPersenPrev: 0,
      };
    }
    return calculateGCGData(activeAssessment, prevAssessment, masterAspects);
  }, [activeAssessment, prevAssessment, masterAspects]);

  const {
    mainAspects: comparativeData,
    modifierAspects,
    totalBobot,
    totalSkorNow,
    totalPersenNow,
    predikatNow,
    totalSkorPrev,
    totalPersenPrev,
  } = gcgData;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 w-full min-w-0 font-sans">
      
      {/* HEADER & DROPDOWN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-900 rounded-xl shadow-lg shadow-slate-200">
            <UploadCloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Auditee Taskboard</h1>
              {/* INLINE LOADING: Murni di sebelah judul aja */}
              {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full animate-in fade-in zoom-in duration-300">
                  <RefreshCw className="w-3 h-3 text-slate-600 animate-spin" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Memuat...</span>
                </div>
              )}
            </div>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Capaian GCG & Divisi: <span className="font-bold text-blue-600">{user?.divisi || 'Belum diatur'}</span></p>
          </div>
        </div>
        
        <div className="w-full md:w-80 relative">
          <select 
            className="w-full appearance-none bg-white border border-slate-300 rounded-xl py-3 px-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer disabled:opacity-50"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            disabled={isSyncing}
          >
            {assessments.length === 0 ? (
              <option value="">Belum ada Assessment</option>
            ) : (
              assessments.map(ass => (
                <option key={ass.id} value={ass.id}>Dashboard TB {ass.year} - {ass.tb}</option>
              ))
            )}
          </select>
          <div className="absolute right-4 top-3.5 pointer-events-none"><Target className="w-4 h-4 text-slate-400" /></div>
        </div>
      </div>

      {/* KONTEN UTAMA: Langsung Tampil Bersih (Transparan sedikit saat isSyncing) */}
      <div className={`transition-opacity duration-500 space-y-6 ${isSyncing ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        
        {/* 1. GCG SUMMARY CARDS (ATAS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 z-10">Tahun Buku Assessment</span>
            <span className="text-4xl font-black text-slate-800 z-10">{activeAssessment ? activeAssessment.year : '-'}</span>
            <span className={`mt-2.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${activeAssessment?.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'} z-10`}>
              Status: {activeAssessment ? activeAssessment.status : 'Belum Tersedia'}
            </span>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 z-10">Total Skor Capaian GCG</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className={`text-4xl font-black ${activeAssessment ? 'text-blue-600' : 'text-slate-400'}`}>{totalSkorNow.toFixed(3)}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ {totalBobot.toFixed(3)}</span>
            </div>
          </div>

          <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center relative overflow-hidden ${predikatNow.bg} ${predikatNow.border}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest mb-1.5 z-10 ${predikatNow.color}`}>Predikat Kualitas GCG</span>
            <span className={`text-3xl font-black z-10 ${predikatNow.color}`}>{predikatNow.label}</span>
          </div>
        </div>

        {/* 2. TASK CARDS (TENGAH) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start gap-4 relative overflow-hidden group hover:border-blue-300 transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0 z-10"><FileWarning size={20} /></div>
            <div className="z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-3xl font-black text-slate-800 leading-none">{stats.needUpload}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Perlu Diunggah</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">Permintaan dokumen dari Auditor yang ditugaskan ke divisi Anda.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start gap-4 relative overflow-hidden group hover:border-red-300 transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors"></div>
            <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0 z-10"><XCircle size={20} /></div>
            <div className="z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-3xl font-black leading-none ${stats.rejected > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.rejected}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Perlu Direvisi</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">Dokumen yang ditolak oleh Auditor karena tidak sesuai kriteria.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start gap-4 relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 z-10"><CheckCircle2 size={20} /></div>
            <div className="z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-3xl font-black text-slate-800 leading-none">{stats.approved}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Dokumen Disetujui</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">Total dokumen unggahan Anda yang sudah disetujui (Approved).</p>
            </div>
          </div>
        </div>

        {/* 3. TABEL KOMPARASI (BAWAH) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Rekapitulasi Penilaian & Tren YoY</h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 w-12 text-center">No</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200">Aspek Penilaian</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-center w-24">Bobot (%)</th>
                  {/* Header Tahun Sebelumnya */}
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-slate-200/50">
                    Tahun {prevAssessment ? prevAssessment.year : 'Sebelumnya'}
                  </th>
                  
                  {/* Header Tahun Terpilih */}
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-blue-50 text-blue-700">
                    Tahun {activeAssessment ? activeAssessment.year : 'Berjalan'}
                  </th>
                  
                  <th rowSpan={2} className="px-4 py-3 text-center w-28">Tren Capaian</th>
                </tr>
                <tr>
                  {/* Sub-Header Tahun Sebelumnya */}
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">Skor</th>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">CAPAIAN %</th>
                  
                  {/* Sub-Header Tahun Terpilih */}
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-blue-50/50">Skor</th>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-blue-50/50">CAPAIAN %</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {comparativeData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center border-b border-slate-100">
                      <div className="flex flex-col items-center justify-center">
                        <Info className="w-10 h-10 text-slate-300 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-bold text-slate-500">Belum ada data penilaian.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* ASPEK UTAMA */}
                    {comparativeData.map((row, idx) => (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-600 border-r border-slate-100">{row.bobot.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? row.skorPrev.toFixed(3) : '-'}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? `${row.persenPrev.toFixed(2)}%` : '-'}</td>
                        <td className="px-4 py-3 text-center font-black text-blue-600 border-r border-slate-100 bg-blue-50/20">{row.skorNow.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-100 bg-blue-50/20">{row.persenNow.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">
                          {row.trend === 'up' && <div className="flex items-center justify-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><TrendingUp size={16}/> Naik</div>}
                          {row.trend === 'down' && <div className="flex items-center justify-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest"><TrendingDown size={16}/> Turun</div>}
                          {row.trend === 'same' && <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Minus size={16}/> Tetap</div>}
                          {row.trend === 'none' && <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}

                    {/* ASPEK PENYESUAI / MODIFIER */}
                    {modifierAspects.map((row, idx) => (
                      <tr key={row.id} className={`border-b border-orange-100 transition-colors ${row.isBonusActive ? 'bg-orange-50/30' : 'bg-slate-50 opacity-50'}`}>
                        <td className="px-4 py-3 text-center font-black text-orange-400 border-r border-slate-100">{comparativeData.length + idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-orange-700 border-r border-slate-100 flex items-center justify-between">
                          <span>{row.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-orange-600 border-r border-slate-100">&plusmn; {row.bobot.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? row.skorPrev.toFixed(3) : '-'}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? `${row.persenPrev.toFixed(2)}%` : '-'}</td>
                        <td className={`px-4 py-3 text-center font-black border-r border-slate-100 bg-orange-50/50 ${row.skorNow > 0 ? 'text-emerald-600' : row.skorNow < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{row.skorNow > 0 ? '+' : ''}{row.skorNow.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-bold text-orange-600 border-r border-slate-100 bg-orange-50/50">{row.persenNow.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">
                          {row.trend === 'up' && <div className="flex items-center justify-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><TrendingUp size={16} /> Naik</div>}
                          {row.trend === 'down' && <div className="flex items-center justify-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest"><TrendingDown size={16} /> Turun</div>}
                          {row.trend === 'same' && <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Minus size={16} /> Tetap</div>}
                          {row.trend === 'none' && <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-widest">
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-right border-r border-slate-700">Skor Keseluruhan GCG</td>
                  <td className="px-4 py-4 text-center text-slate-300 border-r border-slate-700">{totalBobot.toFixed(3)}</td>
                  <td className="px-4 py-4 text-center text-slate-400 border-r border-slate-700">{prevAssessment ? totalSkorPrev.toFixed(3) : '-'}</td>
                  <td className="px-4 py-4 text-center text-slate-400 border-r border-slate-700">{prevAssessment ? `${totalPersenPrev.toFixed(2)}%` : '-'}</td>
                  <td className={`px-4 py-4 text-center text-lg border-r border-slate-700 ${activeAssessment ? 'text-blue-400' : 'text-slate-500'}`}>{totalSkorNow.toFixed(3)}</td>
                  <td className={`px-4 py-4 text-center text-lg border-r border-slate-700 ${activeAssessment ? 'text-emerald-400' : 'text-slate-500'}`}>{totalPersenNow.toFixed(2)}%</td>
                  <td className="px-4 py-4 text-center">
                    {prevAssessment ? (
                      totalSkorNow > totalSkorPrev ? <TrendingUp className="text-emerald-400 mx-auto" /> :
                      totalSkorNow < totalSkorPrev ? <TrendingDown className="text-red-400 mx-auto" /> :
                      <Minus className="text-slate-400 mx-auto" />
                    ) : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}