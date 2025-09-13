import { Patient, getTriageLabel, getTriageColor } from '@/types/patient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PatientQueueProps {
  patients: Patient[];
  onPatientSelect: (patient: Patient) => void;
  selectedPatientId?: string;
}

export function PatientQueue({ patients, onPatientSelect, selectedPatientId }: PatientQueueProps) {
  // Sort patients by triage level (1 is highest priority)
  const sortedPatients = [...patients].sort((a, b) => a.triageLevel - b.triageLevel);

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Patient Queue</h2>
        <div className="text-sm text-muted-foreground mb-4">
          {patients.length} patients waiting
        </div>
      </div>

      <div className="space-y-2">
        {sortedPatients.map((patient) => (
          <Card
            key={patient.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-hover ${
              selectedPatientId === patient.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onPatientSelect(patient)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getTriageColor(patient.triageLevel)}`}
                    aria-label={`Triage level ${patient.triageLevel}`}
                  />
                  <span className="font-medium text-foreground">{patient.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`${getTriageColor(patient.triageLevel)} text-white border-0`}
                >
                  {getTriageLabel(patient.triageLevel)}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{patient.age} years, {patient.gender}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  <span className="truncate">{patient.chiefComplaint}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Waiting {formatDistanceToNow(patient.arrivalTime)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">HR:</span>
                  <span className="text-xs font-medium">{patient.vitals.heartRate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">BP:</span>
                  <span className="text-xs font-medium">
                    {patient.vitals.bloodPressure.systolic}/{patient.vitals.bloodPressure.diastolic}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">O2:</span>
                  <span className="text-xs font-medium">{patient.vitals.oxygenSaturation}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}