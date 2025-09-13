export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface Vitals {
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  oxygenSaturation: number;
  temperature: number;
  respiratoryRate: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  arrivalTime: Date;
  triageLevel: TriageLevel;
  chiefComplaint: string;
  vitals: Vitals;
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  notes?: string;
  videoUrl?: string;
  aiSummary?: string;
  assignedNurse?: string;
  status: 'waiting' | 'in-treatment' | 'discharged';
}

export const getTriageLabel = (level: TriageLevel): string => {
  const labels: Record<TriageLevel, string> = {
    1: 'Resuscitation',
    2: 'Emergent',
    3: 'Urgent',
    4: 'Less Urgent',
    5: 'Non-Urgent',
  };
  return labels[level];
};

export const getTriageColor = (level: TriageLevel): string => {
  const colors: Record<TriageLevel, string> = {
    1: 'bg-triage-1',
    2: 'bg-triage-2',
    3: 'bg-triage-3',
    4: 'bg-triage-4',
    5: 'bg-triage-5',
  };
  return colors[level];
};