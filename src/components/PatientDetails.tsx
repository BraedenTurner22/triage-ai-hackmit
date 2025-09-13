import { Patient, getTriageLabel, getTriageColor } from '@/types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Brain
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface PatientDetailsProps {
  patient: Patient;
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  const isVitalCritical = (type: 'heart' | 'bp' | 'oxygen' | 'temp'): boolean => {
    switch (type) {
      case 'heart':
        return patient.vitals.heartRate < 60 || patient.vitals.heartRate > 100;
      case 'bp':
        return patient.vitals.bloodPressure.systolic > 140 || patient.vitals.bloodPressure.diastolic > 90;
      case 'oxygen':
        return patient.vitals.oxygenSaturation < 95;
      case 'temp':
        return patient.vitals.temperature < 36 || patient.vitals.temperature > 38;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Patient Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{patient.name}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{patient.age} years, {patient.gender}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Arrived {formatDistanceToNow(patient.arrivalTime)} ago</span>
                </div>
              </div>
            </div>
            <Badge 
              className={`${getTriageColor(patient.triageLevel)} text-white border-0 px-3 py-1`}
            >
              {getTriageLabel(patient.triageLevel)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Chief Complaint
            </div>
            <p className="text-foreground">{patient.chiefComplaint}</p>
          </div>
        </CardContent>
      </Card>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className={isVitalCritical('heart') ? 'border-status-critical' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heart Rate</p>
                <p className="text-2xl font-bold">{patient.vitals.heartRate}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
              <Heart className={`w-8 h-8 ${isVitalCritical('heart') ? 'text-vitals-heart' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={isVitalCritical('bp') ? 'border-status-critical' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                <p className="text-2xl font-bold">
                  {patient.vitals.bloodPressure.systolic}/{patient.vitals.bloodPressure.diastolic}
                </p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <Activity className={`w-8 h-8 ${isVitalCritical('bp') ? 'text-vitals-pressure' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={isVitalCritical('oxygen') ? 'border-status-critical' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">O2 Saturation</p>
                <p className="text-2xl font-bold">{patient.vitals.oxygenSaturation}%</p>
                <p className="text-xs text-muted-foreground">SpO2</p>
              </div>
              <Droplets className={`w-8 h-8 ${isVitalCritical('oxygen') ? 'text-vitals-oxygen' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={isVitalCritical('temp') ? 'border-status-critical' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold">{patient.vitals.temperature}°C</p>
                <p className="text-xs text-muted-foreground">Core</p>
              </div>
              <Thermometer className={`w-8 h-8 ${isVitalCritical('temp') ? 'text-vitals-temp' : 'text-muted-foreground'}`} />
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
                <p className="text-muted-foreground text-sm">No current medications</p>
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
                    <Badge key={index} variant="destructive">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No known allergies</p>
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
                <p className="text-muted-foreground text-sm">No significant medical history</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="w-4 h-4" />
                Patient Video Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
                <p className="text-muted-foreground">Video stream placeholder - VLM integration</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Clinical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.aiSummary ? (
                <div className="space-y-3">
                  <div className="bg-gradient-medical text-white rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">AI Assessment Summary</p>
                    <p className="text-sm opacity-90">{patient.aiSummary}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Generated at {format(new Date(), 'HH:mm:ss')}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">AI analysis pending...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}