import { useState, useMemo, useEffect } from "react";
import { PatientQueue } from "@/components/PatientQueue";
import { PatientDetails } from "@/components/PatientDetails";
import { EDDashboard } from "@/components/EDDashboard";
import { Patient } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentView, setCurrentView] = useState<"home" | "nurse" | "triage">(
    "home"
  );
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch patients from Supabase
  useEffect(() => {
    fetchPatients();

    // Set up realtime subscription
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patients",
        },
        () => {
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPatients = async () => {
    try {
      setFetchError(null); // Clear any previous errors
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("triage_level", { ascending: true })
        .order("arrival", { ascending: true });

      if (error) throw error;

      // Transform database records to Patient type
      const transformedPatients: Patient[] = (data || []).map((record) => ({
        id: record.id,
        name: record.name,
        age: record.age,
        gender: record.gender as "Male" | "Female" | "Other",
        arrivalTime: new Date(record.arrival),
        triageLevel: record.triage_level as 1 | 2 | 3 | 4 | 5,
        chiefComplaint: record.patient_summary || "No summary available",
        vitals: {
          heartRate: record.heart_rate,
          bloodPressure: {
            systolic: 120, // Default values since not in DB
            diastolic: 80,
          },
          respiratoryRate: record.respiratory_rate,
          temperature: 98.6, // Default value
          oxygenSaturation: 98, // Default value
        },
        allergies: [],
        medications: [],
        medicalHistory: [],
        notes: "",
        aiSummary: record.patient_summary || "",
        status: "waiting" as const,
      }));

      setPatients(transformedPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setFetchError(
        "Failed to load patients from the database. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePatientAdd = async (newPatient: Patient) => {
    try {
      const { error } = await supabase.from("patients").insert({
        name: newPatient.name,
        age: newPatient.age,
        gender: newPatient.gender,
        arrival: newPatient.arrivalTime.toISOString(),
        patient_summary: newPatient.aiSummary || newPatient.chiefComplaint,
        triage_level: newPatient.triageLevel,
        heart_rate: newPatient.vitals.heartRate,
        respiratory_rate: newPatient.vitals.respiratoryRate,
      });

      if (error) throw error;

      toast.success("Patient added successfully");
      fetchPatients(); // Refresh the list
    } catch (error) {
      console.error("Error adding patient:", error);
      toast.error("Failed to add patient");
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    // If clicking the same patient, deselect it
    if (selectedPatient?.id === patient.id) {
      setSelectedPatient(null);
    } else {
      setSelectedPatient(patient);
    }
  };

  const handlePatientRemove = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;

      toast.success("Patient removed from queue");
      // Clear selection if the removed patient was selected
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      fetchPatients(); // Refresh the list
    } catch (error) {
      console.error("Error removing patient:", error);
      toast.error("Failed to remove patient");
    }
  };

  const handleNurseClick = () => {
    setShowPasswordPopup(true);
    setPassword("");
    setPasswordError("");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "huzz") {
      setShowPasswordPopup(false);
      setCurrentView("nurse");
      setPassword("");
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPopup(false);
    setPassword("");
    setPasswordError("");
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
    <div className="min-h-screen relative">
      {/* Universal Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-red-100"></div>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, #dc2626 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        ></div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 30%, transparent 70%, transparent 100%)`,
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="bg-white text-red-900 shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-200 w-fit"
            onClick={() => setCurrentView("home")}
          >
            <Activity className="w-10 h-10 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TriageAI</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 relative">
        {currentView === "home" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] relative">
            {/* Content */}
            <div className="relative z-10 text-center space-y-6 mt-8">
              <div className="space-y-2">
                <h1 className="text-6xl font-bold text-red-900 italic animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                  Lightning-Fast Emergency Care
                </h1>
              </div>
              <p className="text-lg text-red-700 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out mb-0">
                Minimize patient wait times without compromising on quality.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl relative z-10 items-center -mt-24">
              {/* Nurse Dashboard Card */}
              <Card
                className="h-80 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-300"
                onClick={handleNurseClick}
              >
                <CardContent className="flex flex-col items-center justify-center h-full p-8">
                  <div className="bg-blue-500 p-6 rounded-full mb-6">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">
                    Nurse Dashboard
                  </h3>
                  <p className="text-blue-700 text-center">
                    Monitor patient queue, view vitals, and manage triage
                    priorities
                  </p>
                </CardContent>
              </Card>

              {/* Nurse Image */}
              <div className="flex justify-center mt-8">
                <img
                  src="/nurse.png"
                  alt="Professional nurse"
                  className="max-w-full h-auto max-h-120 object-contain drop-shadow-lg opacity-80"
                />
              </div>

              {/* Triage Analysis Card */}
              <Card
                className="h-80 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 hover:border-red-300"
                onClick={() => setCurrentView("triage")}
              >
                <CardContent className="flex flex-col items-center justify-center h-full p-8">
                  <div className="bg-red-500 p-6 rounded-full mb-6">
                    <ClipboardList className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-900 mb-2">
                    Begin Triage Analysis
                  </h3>
                  <p className="text-red-700 text-center">
                    Start your AI-powered triage assessment
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {currentView === "nurse" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView("home")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Home
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground">Loading patients...</p>
                </div>
              </div>
            ) : (
              <>
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
                          <p className="text-3xl font-bold text-black">
                            {stats.queuePercentage}
                            <span className="text-lg">%</span>
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-accent/50" />
                      </div>
                      <div className="mt-2 w-full bg-muted rounded-full h-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(stats.queuePercentage, 100)}%`,
                            backgroundColor: `hsl(${
                              120 - stats.queuePercentage * 1.2
                            }, 70%, 50%)`,
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

                    {/* Error Alert - Show below patient queue if there's a fetch error */}
                    {fetchError && (
                      <Alert className="mt-4 border-red-200 bg-red-50">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {fetchError}
                        </AlertDescription>
                      </Alert>
                    )}
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
              </>
            )}
          </div>
        )}

        {currentView === "triage" && (
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView("home")}
                className="flex items-center gap-2 bg-gray-300 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors shadow-md"
              >
                ← Back to Home
              </button>
            </div>
            <EDDashboard onPatientAdd={handlePatientAdd} />
          </div>
        )}

        {/* Password Popup */}
        {showPasswordPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-center">
                  Nurse Dashboard Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Enter Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoFocus
                    />
                    {passwordError && (
                      <p className="text-sm text-red-500">{passwordError}</p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePasswordCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Access Dashboard</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
