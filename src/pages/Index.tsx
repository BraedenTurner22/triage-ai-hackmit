import { useState } from 'react';
import { PatientQueue } from '@/components/PatientQueue';
import { PatientDetails } from '@/components/PatientDetails';
import { EDDashboard } from '@/components/EDDashboard';
import { Patient } from '@/types/patient';
import { mockPatients } from '@/data/mockPatients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, ClipboardList } from 'lucide-react';

const Index = () => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handlePatientAdd = (newPatient: Patient) => {
    setPatients([...patients, newPatient]);
  };

  const criticalCount = patients.filter(p => p.triageLevel <= 2).length;
  const urgentCount = patients.filter(p => p.triageLevel === 3).length;
  const totalWaiting = patients.filter(p => p.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-medical text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Emergency Department Triage System</h1>
                <p className="text-sm opacity-90">Real-time patient management and monitoring</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs opacity-90">Critical</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{urgentCount}</p>
                <p className="text-xs opacity-90">Urgent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalWaiting}</p>
                <p className="text-xs opacity-90">Total Waiting</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="nurse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="nurse" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Nurse Dashboard
            </TabsTrigger>
            <TabsTrigger value="ed" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              ED Input Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nurse" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient Queue */}
              <div className="lg:col-span-1">
                <PatientQueue
                  patients={patients}
                  onPatientSelect={setSelectedPatient}
                  selectedPatientId={selectedPatient?.id}
                />
              </div>

              {/* Patient Details */}
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <PatientDetails patient={selectedPatient} />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium text-muted-foreground">
                        Select a patient from the queue to view details
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Patients are sorted by triage severity level
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ed" className="space-y-6">
            <EDDashboard onPatientAdd={handlePatientAdd} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;