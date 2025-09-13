import { useState, useMemo } from "react";
import { PatientQueue } from "@/components/PatientQueue";
import { PatientDetails } from "@/components/PatientDetails";
import { EDDashboard } from "@/components/EDDashboard";
import { Patient } from "@/types/patient";
import { mockPatients } from "@/data/mockPatients";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Users,
  ClipboardList,
  AlertTriangle,
  Clock,
  TrendingUp,
  UserCheck,
} from "lucide-react";

const Index = () => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handlePatientAdd = (newPatient: Patient) => {
    setPatients([...patients, newPatient]);
  };

  const handlePatientSelect = (patient: Patient) => {
    // If clicking the same patient, deselect it
    if (selectedPatient?.id === patient.id) {
      setSelectedPatient(null);
    } else {
      setSelectedPatient(patient);
    }
  };

  const handlePatientRemove = (patientId: string) => {
    setPatients(patients.filter((p) => p.id !== patientId));
    // Clear selection if the removed patient was selected
    if (selectedPatient?.id === patientId) {
      setSelectedPatient(null);
    }
  };

  const stats = useMemo(() => {
    const waitingPatients = patients.filter((p) => p.status === "waiting");
    const criticalCount = patients.filter((p) => p.triageLevel <= 2).length;
    const urgentCount = patients.filter((p) => p.triageLevel === 3).length;
    const totalWaiting = waitingPatients.length;

    // Calculate average wait time in minutes
    const avgWaitTime =
      waitingPatients.length > 0
        ? waitingPatients.reduce((acc, p) => {
            const waitMinutes =
              (Date.now() - p.arrivalTime.getTime()) / (1000 * 60);
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
      queuePercentage,
    };
  }, [patients]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-red-100 text-red-900 shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Activity className="w-10 h-10 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Emergency Department Triage System
              </h1>
              <p className="text-sm opacity-90">
                Real-time patient management and monitoring
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="nurse" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50 backdrop-blur-sm">
            <TabsTrigger
              value="nurse"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-4 h-4" />
              Nurse Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="ed"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
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
                      <p className="text-sm font-medium text-muted-foreground">
                        Critical
                      </p>
                      <p className="text-3xl font-bold text-status-critical">
                        {stats.criticalCount}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-status-critical/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-status-urgent/10 to-status-urgent/5 border-status-urgent/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Urgent
                      </p>
                      <p className="text-3xl font-bold text-status-urgent">
                        {stats.urgentCount}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-status-urgent/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Waiting
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {stats.totalWaiting}
                      </p>
                    </div>
                    <UserCheck className="w-8 h-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Avg Wait
                      </p>
                      <p className="text-3xl font-bold text-secondary-foreground">
                        {stats.avgWaitTime}
                        <span className="text-lg">min</span>
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-secondary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Queue Load
                      </p>
                      <p className="text-3xl font-bold text-accent-foreground">
                        {stats.queuePercentage}
                        <span className="text-lg">%</span>
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-accent/50" />
                  </div>
                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(stats.queuePercentage, 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="relative flex gap-6 min-h-[600px]">
              {/* Patient Queue - Dynamic positioning */}
              <div
                className={`transition-all duration-500 ease-in-out ${
                  selectedPatient
                    ? "w-80 ml-auto" // Move to right, fixed width when patient selected
                    : "w-full max-w-md mx-auto" // Center position when no patient selected
                }`}
              >
                <PatientQueue
                  patients={patients}
                  onPatientSelect={handlePatientSelect}
                  onPatientRemove={handlePatientRemove}
                  selectedPatientId={selectedPatient?.id}
                />
              </div>

              {/* Patient Details Portal - Slides in from right */}
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  selectedPatient
                    ? "flex-1 opacity-100 translate-x-0" // Visible and in position
                    : "w-0 opacity-0 translate-x-full" // Hidden and off-screen
                }`}
              >
                {selectedPatient && (
                  <div className="bg-card rounded-lg border border-border shadow-xl w-full">
                    <PatientDetails patient={selectedPatient} />
                  </div>
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
