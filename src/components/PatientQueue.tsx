import { Patient, getTriageLabel, getTriageColor } from "@/types/patient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, User, AlertCircle, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PatientQueueProps {
  patients: Patient[];
  onPatientSelect: (patient: Patient) => void;
  onPatientRemove: (patientId: string) => void;
  selectedPatientId?: string;
}

export function PatientQueue({
  patients,
  onPatientSelect,
  onPatientRemove,
  selectedPatientId,
}: PatientQueueProps) {
  // Sort patients by triage level (1 is highest priority)
  const sortedPatients = [...patients].sort(
    (a, b) => a.triageLevel - b.triageLevel
  );

  const handleRemoveClick = (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation(); // Prevent triggering onPatientSelect
    onPatientRemove(patientId);
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {patients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No patients in queue</p>
            <p className="text-xs">New patients will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPatients.map((patient) => (
              <Card
                key={patient.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4 ${
                  selectedPatientId === patient.id
                    ? "ring-2 ring-primary shadow-lg bg-red-50"
                    : "hover:bg-gray-50"
                } ${getTriageColor(patient.triageLevel).replace(
                  "bg-",
                  "border-l-"
                )}`}
                onClick={() => onPatientSelect(patient)}
              >
                <CardContent className="p-3">
                  {/* Header row with name, triage, and actions */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getTriageColor(
                          patient.triageLevel
                        )}`}
                        aria-label={`Triage level ${patient.triageLevel}`}
                      />
                      <span className="font-medium text-foreground">
                        {patient.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${getTriageColor(
                          patient.triageLevel
                        )} text-white border-0 text-xs px-2 py-0.5`}
                      >
                        {getTriageLabel(patient.triageLevel)}
                      </Badge>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-green-500 hover:text-white transition-colors duration-200"
                            onClick={(e) => handleRemoveClick(e, patient.id)}
                            aria-label={`Mark ${patient.name} as successfully treated`}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Successfully treated</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Content in two columns to make it more horizontal */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>
                          {patient.age}y, {patient.gender}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">
                          {formatDistanceToNow(patient.arrivalTime)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-muted-foreground">
                          HR:
                        </span>
                        <span className="text-xs font-medium">
                          {patient.vitals.heartRate}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          O2:
                        </span>
                        <span className="text-xs font-medium">
                          {patient.vitals.oxygenSaturation}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-muted-foreground">
                          BP:
                        </span>
                        <span className="text-xs font-medium">
                          {patient.vitals.bloodPressure.systolic}/
                          {patient.vitals.bloodPressure.diastolic}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chief complaint spanning full width but compact */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{patient.chiefComplaint}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
