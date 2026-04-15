export interface MasterSubFactor {
  id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterFactor {
  id: string;
  name: string;
  subFactors: MasterSubFactor[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterParameter {
  id: string;
  name: string;
  bobot?: number; // 🆕 Ditambahkan
  factors: MasterFactor[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterIndicator {
  id: string;
  name: string;
  bobot?: number; // 🆕 Ditambahkan
  parameters: MasterParameter[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterAspect {
  id: string;
  name: string;
  bobot?: number; // 🆕 Ditambahkan
  is_modifier?: boolean;
  indicators: MasterIndicator[];
  createdAt?: string;
  updatedAt?: string;
}

export const defaultMasterIndicators: MasterAspect[] = [];

export const generateIndicatorId = (allAspects: MasterAspect[]): string => {
  let count = 0;
  allAspects.forEach(a => count += a.indicators.length);
  return (count + 1).toString();
};

export const generateParameterId = (allAspects: MasterAspect[]): string => {
  let count = 0;
  allAspects.forEach(a => {
    a.indicators.forEach(i => count += i.parameters.length);
  });
  return (count + 1).toString();
};

export const generateFactorId = (allAspects: MasterAspect[]): string => {
  let count = 0;
  allAspects.forEach(a => {
    a.indicators.forEach(i => {
      i.parameters.forEach(p => {
        count += p.factors.length;
      });
    });
  });
  return (count + 1).toString();
};

export const generateSubFactorId = (subFactorIndex: number): string => {
  return String.fromCharCode(97 + subFactorIndex);
};

export const getMasterIndicators = (): MasterAspect[] => {
  try {
    const stored = localStorage.getItem('masterIndicators');
    return stored ? JSON.parse(stored) : defaultMasterIndicators;
  } catch (error) {
    console.error('Error loading master indicators:', error);
    return defaultMasterIndicators;
  }
};

export const saveMasterIndicators = (data: MasterAspect[]): void => {
  try {
    localStorage.setItem('masterIndicators', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving master indicators:', error);
  }
};

export const resetToDefaultMasterIndicators = (): void => {
  saveMasterIndicators(defaultMasterIndicators);
};