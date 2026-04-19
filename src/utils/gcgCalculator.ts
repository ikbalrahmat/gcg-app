import type { MasterAspect } from '../data/masterIndicators';

export interface GcgCategory {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface ComparativeRow {
  id: string;
  name: string;
  bobot: number;
  skorNow: number;
  persenNow: number;
  katNow: GcgCategory | null;
  skorPrev: number;
  persenPrev: number;
  katPrev: GcgCategory | null;
  trend: 'up' | 'down' | 'same' | 'none';
  hasPrev: boolean;
  isBonusActive?: boolean;
}

export interface GcgResult {
  mainAspects: ComparativeRow[];
  modifierAspects: ComparativeRow[];
  totalBobot: number; // Always 100
  totalBaseSkorNow: number; // Raw sum of aspects 1-5
  totalSkorNow: number; // Base + modifiers
  totalPersenNow: number; // Scale 0-100 logically same as totalSkorNow
  predikatNow: GcgCategory;
  
  totalBaseSkorPrev: number;
  totalSkorPrev: number;
  totalPersenPrev: number;
  predikatPrev: GcgCategory;
  
  hasPrevAssessment: boolean;
}

/**
 * Mendapatkan warna kategori dan label standar berdasarkan persentase
 */
export const getKategoriStandar = (persen: number): GcgCategory => {
  if (persen >= 85) return { label: 'SANGAT BAIK', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' };
  if (persen >= 75) return { label: 'BAIK', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' };
  if (persen >= 60) return { label: 'CUKUP BAIK', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' };
  return { label: 'KURANG BAIK', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' };
};

/**
 * SK-16 Rules: Syarat Penalti Predikat Akhir
 * Jika ada salah satu aspek utama yang pemenuhannya (persenDapat) <= batas tertentu,
 * maka maksimal predikat diturunkan.
 */
export const getFinalKategori = (totalScore: number, mainAspects: ComparativeRow[]): GcgCategory => {
  // Hitung tingkat pemenuhan tiap aspek: (skorAspek / bobotMaksimalAspek) * 100
  // Contoh Aspek 1 bobot 7 dapet skor 5 -> 71.4% (masuk kategori penalti karena < 75%)
  const hasAspectBelow75 = mainAspects.some(row => row.bobot > 0 && row.persenNow <= 75);
  const hasAspectBelow60 = mainAspects.some(row => row.bobot > 0 && row.persenNow <= 60);

  if (totalScore > 85) {
    if (hasAspectBelow75) return getKategoriStandar(84); // Paksa turun ke BAIK
    return getKategoriStandar(86); // SANGAT BAIK
  }
  
  if (totalScore > 75) {
    if (hasAspectBelow60) return getKategoriStandar(74); // Paksa turun ke CUKUP BAIK
    return getKategoriStandar(76); // BAIK
  }
  
  return getKategoriStandar(totalScore);
};

export const calculateGCGData = (activeAssessment: any, prevAssessment: any, masterAspects: MasterAspect[]): GcgResult => {
  let mainAspects: ComparativeRow[] = [];
  let modifierAspects: ComparativeRow[] = [];
  
  if (!activeAssessment || masterAspects.length === 0) {
    return {
      mainAspects: [], modifierAspects: [], totalBobot: 100, 
      totalBaseSkorNow: 0, totalSkorNow: 0, totalPersenNow: 0, predikatNow: getKategoriStandar(0),
      totalBaseSkorPrev: 0, totalSkorPrev: 0, totalPersenPrev: 0, predikatPrev: getKategoriStandar(0),
      hasPrevAssessment: false
    };
  }

  let totalBaseSkorNow = 0;
  let totalBaseSkorPrev = 0;

  // 1. Hitung Aspek Utama
  mainAspects = masterAspects.filter(a => !a.is_modifier).map(aspect => {
    const bobot = Number(aspect.bobot || 0);
    
    // Now Calculation
    const dataNow = activeAssessment.data[aspect.id] || [];
    const skorNow = dataNow.reduce((sum: number, ind: any) => sum + (Number(ind.indicatorScore) || 0), 0);
    const persenNow = bobot > 0 ? (skorNow / bobot) * 100 : 0;
    const katNow = getKategoriStandar(persenNow);
    totalBaseSkorNow += skorNow;

    // Prev Calculation
    let skorPrev = 0, persenPrev = 0, katPrev = null, trend: 'up'|'down'|'same'|'none' = 'none';
    if (prevAssessment && prevAssessment.data[aspect.id]) {
      const dataPrev = prevAssessment.data[aspect.id] || [];
      skorPrev = dataPrev.reduce((sum: number, ind: any) => sum + (Number(ind.indicatorScore) || 0), 0);
      persenPrev = bobot > 0 ? (skorPrev / bobot) * 100 : 0;
      katPrev = getKategoriStandar(persenPrev);
      totalBaseSkorPrev += skorPrev;
      
      if (skorNow > skorPrev) trend = 'up';
      else if (skorNow < skorPrev) trend = 'down';
      else trend = 'same';
    }

    return { id: aspect.id, name: aspect.name, bobot, skorNow, persenNow, katNow, skorPrev, persenPrev, katPrev, trend, hasPrev: !!prevAssessment };
  });

  // 2. Hitung Aspek Modifier
  modifierAspects = masterAspects.filter(a => a.is_modifier).map(aspect => {
    const rawBobot = Number(aspect.bobot || 0);
    const bobot = rawBobot; // Purely reliant on user input from DB

    // Now Calculation
    const dataNow = activeAssessment.data[aspect.id] || [];
    let skorNow = dataNow.reduce((sum: number, ind: any) => sum + (Number(ind.indicatorScore) || 0), 0);
    let isBonusActiveNow = true;

    if (skorNow > 0) { // Indikator Bonus
       if (totalBaseSkorNow > 85) {
          isBonusActiveNow = true;
       } else {
          isBonusActiveNow = false;
          skorNow = 0; // Hangus karena Base < 85
       }
    } 

    // Prev Calculation
    let skorPrev = 0, trend: 'up'|'down'|'same'|'none' = 'none';
    if (prevAssessment && prevAssessment.data[aspect.id]) {
      const dataPrev = prevAssessment.data[aspect.id] || [];
      skorPrev = dataPrev.reduce((sum: number, ind: any) => sum + (Number(ind.indicatorScore) || 0), 0);
      
      if (skorPrev > 0 && totalBaseSkorPrev <= 85) {
         skorPrev = 0; // Hangus
      }

      if (skorNow > skorPrev) trend = 'up';
      else if (skorNow < skorPrev) trend = 'down';
      else trend = 'same';
    }

    const persenNow = (skorNow / bobot) * 100;
    const katNow = getKategoriStandar(Math.abs(persenNow));

    const persenPrev = (skorPrev / bobot) * 100;
    const katPrev = getKategoriStandar(Math.abs(persenPrev));

    return { 
      id: aspect.id, name: aspect.name, bobot, skorNow, persenNow, katNow, 
      skorPrev, persenPrev, katPrev, trend, hasPrev: !!prevAssessment, isBonusActive: isBonusActiveNow 
    };
  });

  // 3. Totalkan Semua (Base + Modifier)
  const totalSkorNow = totalBaseSkorNow + modifierAspects.reduce((sum, item) => sum + item.skorNow, 0);
  const totalSkorPrev = totalBaseSkorPrev + modifierAspects.reduce((sum, item) => sum + item.skorPrev, 0);

  // 4. Kalkulasi Final Sesuai Syarat Predikat SK-16 (BUG C diatasi disini)
  const totalPersenNow = totalSkorNow; // Karena range batas skor sudah dinormalisasi dari 0-100 di level parameter
  const totalPersenPrev = totalSkorPrev;

  // Cek apakah ada aspek <= 75% TINGKAT PEMENUHAN (persenNow) 
  const predikatNow = getFinalKategori(totalPersenNow, mainAspects);
  
  // Untuk prev, kita buat array buatan jika array main prev dibutuhkan oleh getFinalKategori. 
  // Karena row mainAspects sudah punya persenPrev, kita bisa buat mock datanya.
  const prevMainAspectsMock = mainAspects.map(r => ({ ...r, persenNow: r.persenPrev }));
  const predikatPrev = prevAssessment ? getFinalKategori(totalPersenPrev, prevMainAspectsMock) : getKategoriStandar(0);

  return {
    mainAspects, modifierAspects, totalBobot: 100,
    totalBaseSkorNow, totalSkorNow, totalPersenNow, predikatNow,
    totalBaseSkorPrev, totalSkorPrev, totalPersenPrev, predikatPrev,
    hasPrevAssessment: !!prevAssessment
  };
};
