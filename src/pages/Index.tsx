import { useState, useMemo } from 'react';
import { PatientQueue } from '@/components/PatientQueue';
import { PatientDetails } from '@/components/PatientDetails';
import { EDDashboard } from '@/components/EDDashboard';
import { Patient } from '@/types/patient';
import { mockPatients } from '@/data/mockPatients';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, ClipboardList, AlertTriangle, Clock, TrendingUp, UserCheck } from 'lucide-react';

const Index = () => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handlePatientAdd = (newPatient: Patient) => {
    setPatients([...patients, newPatient]);
  };

  const stats = useMemo(() => {
    const waitingPatients = patients.filter(p => p.status === 'waiting');
    const criticalCount = patients.filter(p => p.triageLevel <= 2).length;
    const urgentCount = patients.filter(p => p.triageLevel === 3).length;
    const totalWaiting = waitingPatients.length;
    
    // Calculate average wait time in minutes
    const avgWaitTime = waitingPatients.length > 0
      ? waitingPatients.reduce((acc, p) => {
          const waitMinutes = (Date.now() - p.arrivalTime.getTime()) / (1000 * 60);
          return acc + waitMinutes;
        }, 0) / waitingPatients.length
      : 0;
    
    // Queue capacity (assuming max capacity of 20 patients)
    const maxCapacity = 20;
    const queuePercentage = Math.round((totalWaiting / maxCapacity) * 100);
    
    return {
      criticalCount,
      urgentCount,
      totalWaiting,
      avgWaitTime: Math.round(avgWaitTime),
      queuePercentage
    };
  }, [patients]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary via-primary-foreground/90 to-primary text-white shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Activity className="w-10 h-10 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Emergency Department Triage System</h1>
              <p className="text-sm opacity-90">Real-time patient management and monitoring</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="nurse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="nurse" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4" />
              Nurse Dashboard
            </TabsTrigger>
            <TabsTrigger value="ed" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4" />
              ED Input Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nurse" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-status-critical/10 to-status-critical/5 border-status-critical/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Critical</p>
                      <p className="text-3xl font-bold text-status-critical">{stats.criticalCount}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-status-critical/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-status-urgent/10 to-status-urgent/5 border-status-urgent/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Urgent</p>
                      <p className="text-3xl font-bold text-status-urgent">{stats.urgentCount}</p>
                    </div>
                    <Users className="w-8 h-8 text-status-urgent/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Waiting</p>
                      <p className="text-3xl font-bold text-primary">{stats.totalWaiting}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Wait</p>
                      <p className="text-3xl font-bold text-secondary-foreground">{stats.avgWaitTime}<span className="text-lg">min</span></p>
                    </div>
                    <Clock className="w-8 h-8 text-secondary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Queue Load</p>
                      <p className="text-3xl font-bold text-accent-foreground">{stats.queuePercentage}<span className="text-lg">%</span></p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-accent/50" />
                  </div>
                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.queuePercentage, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient Queue */}
              <div className="lg:col-span-1">
                <PatientQueue
                  patients={patients}
                  onPatientSelect={setSelectedPatient}
                  selectedPatientId={selectedPatient?.id}
                />
              </div>

              {/* Patient Details Portal */}
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <div className="bg-card rounded-lg border border-border shadow-xl">
                    <PatientDetails patient={selectedPatient} />
                  </div>
                ) : (
                  <Card className="h-full flex items-center justify-center bg-gradient-to-br from-card to-muted/20 border-2 border-dashed">
                    <CardContent className="text-center py-16">
                      <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-primary" />
                      </div>
                      <p className="text-xl font-semibold text-foreground mb-2">
                        Select a patient to begin
                      </p>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Click on any patient in the queue to view their comprehensive health portal with vitals, video stream, and AI analysis
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