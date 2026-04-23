import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../utils/api';
import { Target, TrendingUp, TrendingDown, Minus, Info, RefreshCw } from 'lucide-react';
import type { MasterAspect } from '../../data/masterIndicators';
import { calculateGCGData } from '../../utils/gcgCalculator';

interface AssessmentMeta {
  id: string;
  year: string;
  tb: string;
  status: string;
  data: Record<string, any>;
}

export default function Dashboard() {
  
  const [assessments, setAssessments] = useState<AssessmentMeta[]>([]);
  const [masterAspects, setMasterAspects] = useState<MasterAspect[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  // State untuk loading proses tanpa menghilangkan kerangka
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    const headers = { 'Accept': 'application/json' };
    setIsSyncing(true); // Mulai proses sinkronisasi

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
        const filtered = allAss.filter((a: any) => a.status !== 'Draft');
        filtered.sort((a: any, b: any) => Number(b.year) - Number(a.year));
        
        setAssessments(filtered);
        
        if (filtered.length > 0 && !selectedAssessmentId) {
          setSelectedAssessmentId(filtered[0].id);
        }
      }
    } catch (e) {
      console.error("Gagal load data Dashboard", e);
    } finally {
      // Kasih delay dikit biar animasinya kerasa halus
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessmentId]); // Re-fetch data kalau ID ganti

  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId) || null;

  const prevAssessment = useMemo(() => {
    if (!activeAssessment) return null;
    const targetYear = String(Number(activeAssessment.year) - 1);
    return assessments.find(a => a.year === targetYear && a.status !== 'Draft');
  }, [activeAssessment, assessments]);

  const gcgData = useMemo(() => {
    if (!activeAssessment) {
      return {
        mainAspects: [],
        modifierAspects: [],
        totalBobot: 0,
        totalSkorNow: 0,
        totalPersenNow: 0,
        predikatNow: { label: '-', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
        totalSkorPrev: 0,
        totalPersenPrev: 0,
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
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 w-full min-w-0 font-sans relative">
      
      {/* HEADER & DROPDOWN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
            <HomeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Executive Dashboard</h1>
              {/* LOADING INDICATOR: Muncul di sebelah judul biar desain gak hilang */}
              {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full animate-in fade-in zoom-in duration-300">
                  <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Memuat...</span>
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500">Monitoring Performa GCG Perusahaan</p>
          </div>
        </div>
        
        <div className="w-full md:w-80 relative group">
          <select 
            className="w-full appearance-none bg-white border border-slate-300 rounded-xl py-3 px-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer disabled:opacity-50"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            disabled={isSyncing}
          >
            {assessments.length === 0 ? (
               <option value="">Belum ada Assessment</option>
            ) : (
               assessments.map(ass => (
                 <option key={ass.id} value={ass.id}>
                   Dashboard TB {ass.year} - {ass.tb}
                 </option>
               ))
            )}
          </select>
          <div className="absolute right-4 top-3.5 pointer-events-none">
            <Target className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      <div className={`transition-opacity duration-500 ${isSyncing ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        {/* TOP SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors duration-500"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 z-10">Tahun Buku Assessment</span>
            <span className="text-4xl font-black text-slate-800 tracking-tight z-10">{activeAssessment ? activeAssessment.year : '-'}</span>
            <span className={`mt-2.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${activeAssessment?.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'} z-10`}>
              Status: {activeAssessment ? activeAssessment.status : 'Belum Tersedia'}
            </span>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors duration-500"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 z-10">Total Skor Capaian GCG</span>
            <div className="flex items-baseline gap-2 z-10">
              <span className={`text-4xl font-black tracking-tight ${activeAssessment ? 'text-indigo-600' : 'text-slate-400'}`}>{totalSkorNow.toFixed(3)}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ {totalBobot.toFixed(3)}</span>
            </div>
          </div>

          <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center relative overflow-hidden ${predikatNow.bg} ${predikatNow.border}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest mb-1.5 z-10 ${predikatNow.color}`}>Predikat Kualitas GCG</span>
            <span className={`text-3xl font-black tracking-tight z-10 ${predikatNow.color}`}>{predikatNow.label}</span>
          </div>
        </div>

        {/* TABEL KOMPARASI YoY */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-2">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              Rekapitulasi Penilaian & Tren YoY
            </h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 w-12 text-center">No</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200">Aspek Penilaian</th>
                  <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-center w-24">Bobot (%)</th>
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-slate-200/50">Tahun {prevAssessment ? prevAssessment.year : 'Sebelumnya'}</th>
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-200 text-center bg-indigo-50 text-indigo-700">Tahun {activeAssessment ? activeAssessment.year : 'Berjalan'}</th>
                  <th rowSpan={2} className="px-4 py-3 text-center w-28">Tren Capaian</th>
                </tr>
                <tr>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">Skor</th>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">CAPAIAN %</th>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-indigo-50/50">Skor</th>
                  <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-indigo-50/50">CAPAIAN %</th>
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
                    {comparativeData.map((row, idx) => (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-600 border-r border-slate-100">{row.bobot.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? row.skorPrev.toFixed(3) : '-'}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? `${row.persenPrev.toFixed(2)}%` : '-'}</td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600 border-r border-slate-100 bg-indigo-50/20">{row.skorNow.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-100 bg-indigo-50/20">{row.persenNow.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">
                          {row.trend === 'up' && <div className="flex items-center justify-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><TrendingUp size={16}/> Naik</div>}
                          {row.trend === 'down' && <div className="flex items-center justify-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest"><TrendingDown size={16}/> Turun</div>}
                          {row.trend === 'same' && <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Minus size={16}/> Tetap</div>}
                          {row.trend === 'none' && <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}
                    {modifierAspects.map((row, idx) => (
                      <tr key={row.id} className={`border-b border-orange-100 transition-colors ${row.isBonusActive ? 'bg-orange-50/30' : 'bg-slate-50 opacity-50'}`}>
                        <td className="px-4 py-3 text-center font-black text-orange-400 border-r border-slate-100">{comparativeData.length + idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-orange-700 border-r border-slate-100"><span>{row.name}</span></td>
                        <td className="px-4 py-3 text-center font-semibold text-orange-600 border-r border-slate-100">&plusmn; {row.bobot.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? row.skorPrev.toFixed(3) : '-'}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? `${row.persenPrev.toFixed(2)}%` : '-'}</td>
                        <td className={`px-4 py-3 text-center font-black border-r border-slate-100 bg-orange-50/50 ${row.skorNow > 0 ? 'text-emerald-600' : row.skorNow < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{row.skorNow > 0 ? '+' : ''}{row.skorNow.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-bold text-orange-600 border-r border-slate-100 bg-orange-50/50">{row.persenNow.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">
                          {row.trend === 'up' && <div className="flex items-center justify-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><TrendingUp size={16}/> Naik</div>}
                          {row.trend === 'down' && <div className="flex items-center justify-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest"><TrendingDown size={16}/> Turun</div>}
                          {row.trend === 'same' && <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Minus size={16}/> Tetap</div>}
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
                  <td className={`px-4 py-4 text-center text-lg border-r border-slate-700 ${activeAssessment ? 'text-indigo-400' : 'text-slate-500'}`}>{totalSkorNow.toFixed(3)}</td>
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

const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);