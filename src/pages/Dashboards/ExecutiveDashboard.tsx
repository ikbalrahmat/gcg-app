import { useState, useEffect, useMemo } from 'react';

import { AlertCircle, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MasterAspect } from '../../data/masterIndicators';

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  // LOAD DATA DARI DATABASE (API)
  useEffect(() => {
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
          // Filter out Draft dan urutkan dari tahun terbaru
          const filtered = allAss.filter((a: any) => a.status !== 'Draft');
          filtered.sort((a: any, b: any) => Number(b.year) - Number(a.year));
          
          setAssessments(filtered);
          
          // Auto-select assessment terbaru jika belum ada yang dipilih
          if (filtered.length > 0 && !selectedAssessmentId) {
            setSelectedAssessmentId(filtered[0].id);
          }
        }
      } catch (e) {
        console.error("Gagal load data Dashboard", e);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Hanya dijalankan sekali saat komponen dimuat

  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId);

  // CARI DATA TAHUN SEBELUMNYA UNTUK KOMPARASI
  const prevAssessment = useMemo(() => {
    if (!activeAssessment) return null;
    const targetYear = String(Number(activeAssessment.year) - 1);
    return assessments.find(a => a.year === targetYear && a.status !== 'Draft');
  }, [activeAssessment, assessments]);

  // LOGIKA PENENTUAN KATEGORI (OTOMATIS)
  const getKategori = (persen: number) => {
    if (persen >= 85) return { label: 'SANGAT BAIK', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' };
    if (persen >= 75) return { label: 'BAIK', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' };
    if (persen >= 60) return { label: 'CUKUP BAIK', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' };
    return { label: 'KURANG', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' };
  };

  // KALKULASI DATA TABEL KOMPARASI
  const comparativeData = useMemo(() => {
    if (!activeAssessment || masterAspects.length === 0) return [];

    return masterAspects.map(aspect => {
      const bobot = Number(aspect.bobot || 0);

      // Data Tahun Terpilih (Current)
      const dataNow = activeAssessment.data[aspect.id] || [];
      const skorNow = dataNow.reduce((sum: number, ind: any) => sum + (Number(ind.indicatorScore) || 0), 0);
      const persenNow = bobot > 0 ? (skorNow / bobot) * 100 : 0;
      const katNow = getKategori(persenNow);

      // Data Tahun Sebelumnya (Previous)
      let skorPrev = 0;
      let persenPrev = 0;
      let katPrev = null;
      if (prevAssessment && prevAssessment.data[aspect.id]) {
         const dataPrev = prevAssessment.data[aspect.id] || [];
         skorPrev = dataPrev.reduce((sum: number, ind: any) => sum + (Number(ind.indicatorScore) || 0), 0);
         persenPrev = bobot > 0 ? (skorPrev / bobot) * 100 : 0;
         katPrev = getKategori(persenPrev);
      }

      // Tren
      let trend = 'none';
      if (prevAssessment) {
        if (skorNow > skorPrev) trend = 'up';
        else if (skorNow < skorPrev) trend = 'down';
        else trend = 'same';
      }

      return {
        id: aspect.id,
        name: aspect.name,
        bobot,
        skorNow, persenNow, katNow,
        skorPrev, persenPrev, katPrev,
        trend,
        hasPrev: !!prevAssessment
      };
    });
  }, [activeAssessment, prevAssessment, masterAspects]);

  // TOTAL CAPAIAN SUMMARY
  const totalBobot = comparativeData.reduce((sum, item) => sum + item.bobot, 0);
  const totalSkorNow = comparativeData.reduce((sum, item) => sum + item.skorNow, 0);
  const totalPersenNow = totalBobot > 0 ? (totalSkorNow / totalBobot) * 100 : 0;
  const predikatNow = getKategori(totalPersenNow);

  const totalSkorPrev = comparativeData.reduce((sum, item) => sum + item.skorPrev, 0);
  const totalPersenPrev = totalBobot > 0 ? (totalSkorPrev / totalBobot) * 100 : 0;
  const predikatPrev = getKategori(totalPersenPrev);

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500 w-full min-w-0">
      
      {/* HEADER & DROPDOWN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200">
            <HomeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Executive Dashboard</h1>
            <p className="text-slate-500 font-medium text-sm">Monitoring Performa GCG Perusahaan</p>
          </div>
        </div>
        
        <div className="w-full md:w-80 relative group">
          <select 
            className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 px-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 hover:border-slate-200 transition-all shadow-sm cursor-pointer"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
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

      {assessments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 uppercase">Belum Ada Data GCG</h2>
          <p className="text-slate-500 font-medium">Buat dan kerjakan Assessment terlebih dahulu untuk melihat Dashboard.</p>
        </div>
      ) : activeAssessment ? (
        <>
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
            <div className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors duration-500"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 z-10">Tahun Buku Assessment</span>
              <span className="text-6xl font-black text-slate-800 tracking-tight z-10">{activeAssessment.year}</span>
              <span className={`mt-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded border ${activeAssessment.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'} z-10`}>
                Status: {activeAssessment.status}
              </span>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-violet-50 rounded-full blur-3xl group-hover:bg-violet-100 transition-colors duration-500"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 z-10">Total Skor Capaian GCG</span>
              <div className="flex items-baseline gap-2 z-10">
                <span className="text-6xl font-black text-indigo-600 tracking-tight">{totalSkorNow.toFixed(3)}</span>
                <span className="text-sm font-bold text-slate-400 mb-1">/ {totalBobot.toFixed(3)}</span>
              </div>
            </div>

            <div className={`p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border flex flex-col justify-center items-center text-center relative overflow-hidden ${predikatNow.bg} ${predikatNow.border}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest mb-2 z-10 ${predikatNow.color}`}>Predikat Kualitas GCG</span>
              <span className={`text-4xl font-black tracking-tight z-10 ${predikatNow.color}`}>{predikatNow.label}</span>
            </div>
          </div>

          {/* TABEL KOMPARASI (YoY) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
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
                    
                    {/* Header Tahun Sebelumnya */}
                    <th colSpan={3} className="px-4 py-2 border-r border-slate-200 text-center bg-slate-200/50">
                      Tahun {prevAssessment ? prevAssessment.year : 'Sebelumnya'}
                    </th>
                    
                    {/* Header Tahun Terpilih */}
                    <th colSpan={3} className="px-4 py-2 border-r border-slate-200 text-center bg-blue-50 text-blue-700">
                      Tahun {activeAssessment.year}
                    </th>
                    
                    <th rowSpan={2} className="px-4 py-3 text-center w-28">Tren Capaian</th>
                  </tr>
                  <tr>
                    {/* Sub-Header Tahun Sebelumnya */}
                    <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">Skor</th>
                    <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">%</th>
                    <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-slate-50">Kategori</th>
                    
                    {/* Sub-Header Tahun Terpilih */}
                    <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-blue-50/50">Skor</th>
                    <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-blue-50/50">%</th>
                    <th className="px-3 py-2 border-r border-t border-slate-200 text-center bg-blue-50/50">Kategori</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {comparativeData.map((row, idx) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                      <td className="px-4 py-4 font-bold text-slate-700 border-r border-slate-100">{row.name}</td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-600 border-r border-slate-100">{row.bobot.toFixed(3)}</td>
                      
                      {/* Data Tahun Sebelumnya */}
                      <td className="px-4 py-4 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? row.skorPrev.toFixed(3) : '-'}</td>
                      <td className="px-4 py-4 text-center font-medium text-slate-500 border-r border-slate-100">{row.hasPrev ? `${row.persenPrev.toFixed(2)}%` : '-'}</td>
                      <td className="px-4 py-4 text-center border-r border-slate-100">
                        {row.hasPrev && row.katPrev ? (
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${row.katPrev.bg} ${row.katPrev.color}`}>
                            {row.katPrev.label}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Data Tahun Terpilih */}
                      <td className="px-4 py-4 text-center font-black text-blue-600 border-r border-slate-100 bg-blue-50/20">{row.skorNow.toFixed(3)}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-700 border-r border-slate-100 bg-blue-50/20">{row.persenNow.toFixed(2)}%</td>
                      <td className="px-4 py-4 text-center border-r border-slate-100 bg-blue-50/20">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${row.katNow.bg} ${row.katNow.color}`}>
                          {row.katNow.label}
                        </span>
                      </td>

                      {/* Tren */}
                      <td className="px-4 py-4 text-center">
                        {row.trend === 'up' && <div className="flex items-center justify-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest"><TrendingUp size={16}/> Naik</div>}
                        {row.trend === 'down' && <div className="flex items-center justify-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-widest"><TrendingDown size={16}/> Turun</div>}
                        {row.trend === 'same' && <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Minus size={16}/> Tetap</div>}
                        {row.trend === 'none' && <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-widest">
                  <tr>
                    <td colSpan={2} className="px-4 py-5 text-right border-r border-slate-700">Skor Keseluruhan GCG</td>
                    <td className="px-4 py-5 text-center text-slate-300 border-r border-slate-700">{totalBobot.toFixed(3)}</td>
                    
                    {/* Total Sebelumnya */}
                    <td className="px-4 py-5 text-center text-slate-400 border-r border-slate-700">{prevAssessment ? totalSkorPrev.toFixed(3) : '-'}</td>
                    <td className="px-4 py-5 text-center text-slate-400 border-r border-slate-700">{prevAssessment ? `${totalPersenPrev.toFixed(2)}%` : '-'}</td>
                    <td className="px-4 py-5 text-center border-r border-slate-700">
                      {prevAssessment ? <span className={`px-2 py-1 rounded text-[9px] font-black ${predikatPrev.color.replace('text-', 'text-').replace('-700', '-400')}`}>{predikatPrev.label}</span> : '-'}
                    </td>

                    {/* Total Terpilih */}
                    <td className="px-4 py-5 text-center text-blue-400 text-lg border-r border-slate-700">{totalSkorNow.toFixed(3)}</td>
                    <td className="px-4 py-5 text-center text-emerald-400 text-lg border-r border-slate-700">{totalPersenNow.toFixed(2)}%</td>
                    <td className="px-4 py-5 text-center border-r border-slate-700">
                      <span className={`px-2 py-1 rounded text-[9px] font-black ${predikatNow.color.replace('text-', 'text-').replace('-700', '-400')}`}>
                        {predikatNow.label}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-center">
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

        </>
      ) : null}
    </div>
  );
}

// Bantuan Import Icon
const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);