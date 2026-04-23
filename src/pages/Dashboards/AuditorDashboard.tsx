import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

import { fetchApi } from '../../utils/api';
import { FileSearch, Clock, AlertCircle, FileText, Target, TrendingUp, TrendingDown, Minus, RefreshCw, Info } from 'lucide-react';
import { calculateGCGData } from '../../utils/gcgCalculator';

export default function AuditorDashboard() {
  const { user } = useAuth();
  const userRole = String(user?.role || '').toLowerCase().trim();
  const userLevel = String(user?.level || '').toLowerCase().trim();
  const myName = (user?.name || '').toLowerCase().trim();

  // God mode untuk Ketua Tim atau Admin
  const isGodMode =
    ['super_admin', 'admin_spi', 'admin', 'manajemen'].includes(userRole) ||
    (userRole === 'auditor' && ['ketua tim', 'pengendali teknis'].includes(userLevel));

  const [stats, setStats] = useState({
    pendingEvidences: 0,
    openRequests: 0,
    openTLs: 0
  });
  
  // State untuk Inline Loading
  const [isSyncing, setIsSyncing] = useState(false);

  const [assessments, setAssessments] = useState<any[]>([]);
  const [masterAspects, setMasterAspects] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const [requests, setRequests] = useState<any[]>([]);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [tlRecordsDict, setTlRecordsDict] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsSyncing(true); // Mulai loading inline
      const headers = { 'Accept': 'application/json' };

      try {
        // 1. Fetch Master & Assessments
        const [resMaster, resAss, resReq, resEvi, resTL] = await Promise.all([
          fetchApi('/master-indicators', { headers }),
          fetchApi('/assessments', { headers }),
          fetchApi('/document-requests', { headers }),
          fetchApi('/evidences', { headers }),
          fetchApi('/tl-records', { headers })
        ]);

        if (resMaster.ok) {
          const resData = await resMaster.json();
          setMasterAspects(Array.isArray(resData) ? resData : (resData.data || []));
        }

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

        if (resReq.ok) {
          const resData = await resReq.json();
          setRequests(Array.isArray(resData) ? resData : (resData.data || []));
        }

        if (resEvi.ok) {
          const resData = await resEvi.json();
          setEvidences(Array.isArray(resData) ? resData : (resData.data || []));
        }

        if (resTL.ok) {
          const resData = await resTL.json();
          setTlRecordsDict((resData && !Array.isArray(resData)) ? resData : {});
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
  }, [selectedAssessmentId]); // Fetch saat assessment diganti

  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId);

  // Re-calculate stats when assessment changes
  useEffect(() => {
    if (!activeAssessment) {
      setStats({ pendingEvidences: 0, openRequests: 0, openTLs: 0 });
      return;
    }

    // 1. Requests
    const myRequests = isGodMode ? requests : requests.filter((r: any) => (r.requestedBy || '').toLowerCase().trim() === myName);
    const myAssReq = myRequests.filter((r: any) => String(r.assessmentId) === String(activeAssessment.id));
    const openReq = myAssReq.filter((r: any) => r.status === 'Requested' || r.status === 'Open').length;

    // 2. Evidence
    const myParamIds = myAssReq.map((r: any) => r.parameterId);
    const pendingEvi = evidences.filter((e: any) =>
      myParamIds.includes(e.parameterId) && (e.status === 'Menunggu Verifikasi' || e.status === 'Pending')
    ).length;

    // 3. TL Records
    let openTL = 0;
    if (activeAssessment.status !== 'Draft' && activeAssessment.data && typeof activeAssessment.data === 'object') {
      Object.entries(activeAssessment.data).forEach(([aspectId, indicators]: [string, any]) => {
        indicators.forEach((ind: any) => {
          ind.parameters.forEach((param: any) => {
            param.factors.forEach((factor: any) => {
              if (factor.recommendation && factor.dueDate) {
                if (isGodMode || (factor.picAuditor || '').toLowerCase().trim() === myName) {
                  const tId = `${activeAssessment.id}_${aspectId}_${ind.id}_${param.id}_${factor.id}`;
                  const tlStatus = tlRecordsDict[tId]?.status;
                  if (tlStatus !== 'Closed' && tlStatus !== 'Selesai') openTL++;
                }
              }
            });
          });
        });
      });
    }

    setStats({ pendingEvidences: pendingEvi, openRequests: openReq, openTLs: openTL });
  }, [activeAssessment, requests, evidences, tlRecordsDict, isGodMode, myName]);
  
  const prevAssessment = useMemo(() => {
    if (!activeAssessment) return null;
    const targetYear = String(Number(activeAssessment.year) - 1);
    return assessments.find(a => a.year === targetYear && a.status !== 'Draft');
  }, [activeAssessment, assessments]);

  // Kalkulasi data GCG dengan nilai default jika data kosong
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
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 w-full min-w-0">

      {/* HEADER & DROPDOWN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
            <FileSearch className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Auditor Workspace</h1>
              {/* INLINE LOADING: Murni di sebelah judul aja */}
              {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full animate-in fade-in zoom-in duration-300">
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Memuat...</span>
                </div>
              )}
            </div>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Capaian GCG & Ringkasan Tugas</p>
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

      {/* KONTEN UTAMA: Langsung Tampil Bersih (Kerangka tidak hilang) */}
      <div className="space-y-6">
        
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start gap-4 relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors"></div>
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shrink-0 z-10"><Clock size={20} /></div>
            <div className="z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-3xl font-black text-slate-800 leading-none">{stats.pendingEvidences}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Dokumen Reviu</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">Dokumen bukti dari Auditee yang menunggu persetujuan Anda.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start gap-4 relative overflow-hidden group hover:border-blue-300 transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0 z-10"><FileText size={20} /></div>
            <div className="z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-3xl font-black text-slate-800 leading-none">{stats.openRequests}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Permintaan Dokumen</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">Permintaan dokumen yang belum dipenuhi oleh divisi terkait.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start gap-4 relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 z-10"><AlertCircle size={20} /></div>
            <div className="z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-3xl font-black text-slate-800 leading-none">{stats.openTLs}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Pantauan Tindak Lanjut</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-snug">Tindak Lanjut dari temuan sebelumnya yang statusnya belum Closed.</p>
            </div>
          </div>
        </div>

        {/* 3. TABEL KOMPARASI (BAWAH) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-2">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Rekapitulasi Penilaian & Tren YoY</h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 w-12 text-center">No</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200">Aspek Penilaian</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-center w-24">Bobot (%)</th>
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-slate-200/50">Tahun {prevAssessment ? prevAssessment.year : 'Sebelumnya'}</th>
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-blue-50 text-blue-700">Tahun {activeAssessment ? activeAssessment.year : 'Berjalan'}</th>
                  <th rowSpan={2} className="px-4 py-3 text-center w-28">Tren Capaian</th>
                </tr>
                <tr>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">Skor</th>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">CAPAIAN %</th>
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
                          {row.trend === 'up' && <div className="flex items-center justify-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><TrendingUp size={16} /> Naik</div>}
                          {row.trend === 'down' && <div className="flex items-center justify-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest"><TrendingDown size={16} /> Turun</div>}
                          {row.trend === 'same' && <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Minus size={16} /> Tetap</div>}
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