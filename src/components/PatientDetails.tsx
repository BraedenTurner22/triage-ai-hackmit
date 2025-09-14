import { useState, useEffect } from "react";
import { Patient, getTriageLabel, getTriageColor } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TypingText } from "@/components/TypingText";
import {
  Heart,
  Wind,
  Activity,
  User,
  Calendar,
  AlertCircle,
  Pill,
  RefreshCw,
  Loader2,
  Sparkles,
  History,
  Brain,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PatientDetailsProps {
  patient: Patient;
}

interface AISummary {
  summary: string;
  cached: boolean;
  timestamp: string;
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  const [symptomsSummary, setSymptomsSummary] = useState<string>("");
  const [treatmentSummary, setTreatmentSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState<{
    symptoms: boolean;
    treatment: boolean;
  }>({ symptoms: false, treatment: false });

  const isVitalCritical = (type: "heart" | "respiratory" | "pain"): boolean => {
    switch (type) {
      case "heart":
        return patient.vitals.heartRate < 60 || patient.vitals.heartRate > 100;
      case "respiratory":
        return (
          patient.vitals.respiratoryRate < 12 ||
          patient.vitals.respiratoryRate > 20
        );
      case "pain":
        return patient.vitals.painLevel >= 7; // High pain level
      default:
        return false;
    }
  };

  const fetchAISummary = async (
    type: "symptoms" | "treatment",
    forceRefresh = false
  ) => {
    setLoadingSummary((prev) => ({ ...prev, [type]: true }));

    try {
      const patientData = {
        patient_id: patient.id,
        name: patient.name,
        age: patient.age,
        chief_complaint: patient.chiefComplaint,
        heart_rate: patient.vitals.heartRate,
        respiratory_rate: patient.vitals.respiratoryRate,
        pain_level: patient.vitals.painLevel,
        triage_level: patient.triageLevel,
        medical_history: patient.medicalHistory || [],
        medications: patient.medications || [],
        allergies: patient.allergies || [],
      };

      const endpoint = type === "symptoms" ? "symptoms" : "treatment";
      const refreshParam = forceRefresh ? "?refresh=true" : "";

      const response = await fetch(
        `http://localhost:8001/api/v1/ai-summaries/${endpoint}/${patient.id}${refreshParam}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patientData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} summary`);
      }

      const data: AISummary = await response.json();

      if (type === "symptoms") {
        setSymptomsSummary(data.summary);
      } else {
        setTreatmentSummary(data.summary);
      }
    } catch (error) {
      console.error(`Error fetching ${type} summary:`, error);
      const fallbackMessage = `Unable to generate AI ${type} summary at this time. Please try again later.`;

      if (type === "symptoms") {
        setSymptomsSummary(fallbackMessage);
      } else {
        setTreatmentSummary(fallbackMessage);
      }
    } finally {
      setLoadingSummary((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Load AI summaries when patient changes
  useEffect(() => {
    if (patient?.id) {
      fetchAISummary("symptoms");
      fetchAISummary("treatment");
    }
  }, [patient?.id]);

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto flex-1 p-6 space-y-4">
        {/* Patient Header Portal */}
        <div className="bg-red-50 rounded-xl p-6 shadow-inner">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground mb-1">
                {patient.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-2 bg-card/60 rounded-lg px-3 py-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium">{patient.age} years</span>
                </div>
                <div className="flex items-center gap-2 bg-card/60 rounded-lg px-3 py-1.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      patient.gender === "Male" ? "bg-blue-500" : "bg-pink-500"
                    }`}
                  />
                  <span className="font-medium">{patient.gender}</span>
                </div>
                <div className="flex items-center gap-2 bg-card/60 rounded-lg px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Arrived {formatDistanceToNow(patient.arrivalTime)} ago
                  </span>
                </div>
              </div>
            </div>
            <Badge
              className={`${getTriageColor(
                patient.triageLevel
              )} text-white border-0 px-4 py-2 text-lg font-bold shadow-lg hover:${getTriageColor(
                patient.triageLevel
              )}`}
            >
              {getTriageLabel(patient.triageLevel)}
            </Badge>
          </div>

          <div className="mt-4 bg-card/80 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Chief Complaint
              </span>
            </div>
            <p className="text-lg font-medium text-foreground">
              {patient.chiefComplaint}
            </p>
          </div>
        </div>

        {/* Vitals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            className={isVitalCritical("heart") ? "border-status-critical" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Heart Rate</p>
                  <p className="text-2xl font-bold">
                    {patient.vitals.heartRate}
                  </p>
                  <p className="text-xs text-muted-foreground">bpm</p>
                </div>
                <Heart
                  className={`w-8 h-8 ${
                    isVitalCritical("heart")
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              isVitalCritical("respiratory") ? "border-status-critical" : ""
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Respiratory Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {patient.vitals.respiratoryRate}
                  </p>
                  <p className="text-xs text-muted-foreground">breaths/min</p>
                </div>
                <Wind
                  className={`w-8 h-8 ${
                    isVitalCritical("respiratory")
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={isVitalCritical("pain") ? "border-status-critical" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pain Level</p>
                  <p className="text-2xl font-bold">
                    {patient.vitals.painLevel}/10
                  </p>
                  <p className="text-xs text-muted-foreground">
                    patient reported
                  </p>
                </div>
                <Activity
                  className={`w-8 h-8 ${
                    isVitalCritical("pain")
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Medication and Allergies</TabsTrigger>
            <TabsTrigger value="history">Symptoms</TabsTrigger>
            <TabsTrigger value="ai">Treatment</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.medications.map((med, index) => (
                      <Badge key={index} variant="secondary">
                        {med}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No previous medications recorded
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, index) => (
                      <Badge
                        key={index}
                        variant="destructive"
                        className="bg-red-100 text-red-800 border-red-200"
                      >
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No known allergies
                  </p>
                )}
              </CardContent>
            </Card>

            {patient.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clinical Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{patient.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* AI Symptoms Summary - Only Content */}
            <Card className="overflow-hidden border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Symptoms Analysis
                  </div>
                  <Button
                    onClick={() => fetchAISummary("symptoms", true)}
                    disabled={loadingSummary.symptoms}
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    {loadingSummary.symptoms ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loadingSummary.symptoms ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                      <p className="text-blue-600 font-medium">
                        Generating AI analysis...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Analyzing patient symptoms and vital signs
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                          AI Clinical Assessment
                        </p>
                      </div>
                      {symptomsSummary ? (
                        <TypingText
                          text={symptomsSummary}
                          speed={25}
                          startDelay={300}
                          className="text-blue-900 leading-relaxed text-sm"
                        />
                      ) : (
                        <p className="text-blue-900 leading-relaxed text-sm">
                          No AI analysis available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            {/* AI Treatment Summary */}
            <Card className="overflow-hidden border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Treatment Recommendations
                  </div>
                  <Button
                    onClick={() => fetchAISummary("treatment", true)}
                    disabled={loadingSummary.treatment}
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    {loadingSummary.treatment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loadingSummary.treatment ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-green-600 mx-auto animate-spin" />
                      <p className="text-green-600 font-medium">
                        Generating treatment recommendations...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Analyzing optimal treatment options
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-green-900 uppercase tracking-wide">
                          AI Treatment Plan
                        </p>
                      </div>
                      {treatmentSummary ? (
                        <TypingText
                          text={treatmentSummary}
                          speed={25}
                          startDelay={300}
                          className="text-green-900 leading-relaxed text-sm"
                        />
                      ) : (
                        <p className="text-green-900 leading-relaxed text-sm">
                          No treatment recommendations available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
