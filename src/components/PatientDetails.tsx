import { Patient, getTriageLabel, getTriageColor } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Wind,
  Activity,
  User,
  Calendar,
  AlertCircle,
  Pill,
  History,
  Brain,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PatientDetailsProps {
  patient: Patient;
}

export function PatientDetails({ patient }: PatientDetailsProps) {
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
            <TabsTrigger value="history">
              Symptoms and Video Analysis
            </TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Current Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    Chief Complaint:
                  </p>
                  <p className="text-red-800">{patient.chiefComplaint}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medicalHistory.length > 0 ? (
                  <ul className="space-y-2">
                    {patient.medicalHistory.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No significant medical history
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Video Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {patient.aiSummary ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                          AI Assessment Summary
                        </p>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        {patient.aiSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Confidence Level
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full"
                              style={{ width: "85%" }}
                            />
                          </div>
                          <span className="text-sm font-bold">85%</span>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Analysis Time
                        </p>
                        <p className="text-sm font-semibold">
                          {format(new Date(), "HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3 animate-pulse" />
                    <p className="text-muted-foreground">
                      AI analysis in progress...
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Processing patient data
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card className="overflow-hidden border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="w-5 h-5" />
                  Treatment Plan & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        Recommended Immediate Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-800">
                          Based on patient presentation and AI analysis,
                          immediate treatment recommendations will appear here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Pill className="w-4 h-4 text-blue-600" />
                        Prescribed Medications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-800">
                          Prescribed medications and dosages will be recorded
                          here as treatment progresses.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        Follow-up Care
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <p className="text-sm text-purple-800">
                          Follow-up appointments and discharge instructions will
                          be documented here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
