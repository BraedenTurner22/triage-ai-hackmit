import { Patient, getTriageLabel, getTriageColor } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Droplets,
  Wind,
  Thermometer,
  Activity,
  User,
  Calendar,
  AlertCircle,
  Pill,
  History,
  Video,
  Brain,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface PatientDetailsProps {
  patient: Patient;
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  const isVitalCritical = (
    type: "heart" | "bp" | "oxygen" | "temp"
  ): boolean => {
    switch (type) {
      case "heart":
        return patient.vitals.heartRate < 60 || patient.vitals.heartRate > 100;
      case "bp":
        return (
          patient.vitals.bloodPressure.systolic > 140 ||
          patient.vitals.bloodPressure.diastolic > 90
        );
      case "oxygen":
        return patient.vitals.oxygenSaturation < 95;
      case "temp":
        return (
          patient.vitals.temperature < 36 || patient.vitals.temperature > 38
        );
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* Patient Header Portal */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 shadow-inner">
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
            )} text-white border-0 px-4 py-2 text-lg font-bold shadow-lg`}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          className={isVitalCritical("heart") ? "border-status-critical" : ""}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heart Rate</p>
                <p className="text-2xl font-bold">{patient.vitals.heartRate}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
              <Heart
                className={`w-8 h-8 ${
                  isVitalCritical("heart")
                    ? "text-vitals-heart"
                    : "text-muted-foreground"
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={isVitalCritical("bp") ? "border-status-critical" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                <p className="text-2xl font-bold">
                  {patient.vitals.bloodPressure.systolic}/
                  {patient.vitals.bloodPressure.diastolic}
                </p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <Activity
                className={`w-8 h-8 ${
                  isVitalCritical("bp")
                    ? "text-vitals-pressure"
                    : "text-muted-foreground"
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={isVitalCritical("oxygen") ? "border-status-critical" : ""}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">O2 Saturation</p>
                <p className="text-2xl font-bold">
                  {patient.vitals.oxygenSaturation}%
                </p>
                <p className="text-xs text-muted-foreground">SpO2</p>
              </div>
              <Droplets
                className={`w-8 h-8 ${
                  isVitalCritical("oxygen")
                    ? "text-vitals-oxygen"
                    : "text-muted-foreground"
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={isVitalCritical("temp") ? "border-status-critical" : ""}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold">
                  {patient.vitals.temperature}°C
                </p>
                <p className="text-xs text-muted-foreground">Core</p>
              </div>
              <Thermometer
                className={`w-8 h-8 ${
                  isVitalCritical("temp")
                    ? "text-vitals-temp"
                    : "text-muted-foreground"
                }`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="ai">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Current Medications
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
                  No current medications
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
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Live Patient Video Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-black aspect-video flex items-center justify-center relative">
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">LIVE</span>
                </div>
                <div className="text-center">
                  <Video className="w-16 h-16 text-white/30 mx-auto mb-3" />
                  <p className="text-white/50">
                    Video stream ready for VLM integration
                  </p>
                  <p className="text-white/30 text-sm mt-1">
                    Waiting for connection...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="overflow-hidden border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Clinical Analysis & Recommendations
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
      </Tabs>
    </div>
  );
}
