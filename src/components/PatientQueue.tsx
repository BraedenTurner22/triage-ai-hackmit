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
import { Clock, Check } from "lucide-react";
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
    <TooltipProvider delayDuration={300}>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full ${getTriageColor(
                          patient.triageLevel
                        )} flex items-center justify-center text-white text-xs font-bold`}
                      >
                        {patient.triageLevel}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {patient.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Age {patient.age} •{" "}
                          {formatDistanceToNow(patient.arrivalTime)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${getTriageColor(
                          patient.triageLevel
                        )} text-white border-0 text-xs px-2 py-1`}
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
                        <TooltipContent
                          side="top"
                          sideOffset={8}
                          className="z-[9999] bg-gray-900 text-white border-gray-700"
                        >
                          <p>Successfully treated</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
