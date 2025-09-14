export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface Vitals {
  heartRate: number;
  respiratoryRate: number;
  painLevel: number; // 1-10 scale
}

export interface PainAssessment {
  average_pain: number; // 0-10 scale from facial analysis
  max_pain: number; // 0-10 scale from facial analysis
  pain_readings: number; // Number of readings collected
  overall_confidence: number; // 0-1 scale
  medical_pain_level: number; // 1-10 scale for medical use
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  arrivalTime: Date;
  triageLevel: TriageLevel;
  chiefComplaint: string;
  vitals: Vitals;
  painAssessment?: PainAssessment;
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  notes?: string;
  videoUrl?: string;
  aiSummary?: string;
  assignedNurse?: string;
  status: "waiting" | "in-treatment" | "discharged";
}

export const getTriageLabel = (level: TriageLevel): string => {
  const labels: Record<TriageLevel, string> = {
    1: "Resuscitation",
    2: "Emergent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-Urgent",
  };
  return labels[level];
};

export const getTriageColor = (level: TriageLevel): string => {
  const colors: Record<TriageLevel, string> = {
    1: "bg-triage-1",
    2: "bg-triage-2",
    3: "bg-triage-3",
    4: "bg-triage-4",
    5: "bg-triage-5",
  };
  return colors[level];
};
