import { useState, useMemo, useEffect } from "react";
import { PatientQueue } from "@/components/PatientQueue";
import { PatientDetails } from "@/components/PatientDetails";
import { Patient } from "@/types/patient";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Activity,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  UserCheck,
} from "lucide-react";

const Dashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
      console.log("🔍 Fetching patients from Supabase...");

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("triage_level", { ascending: true })
        .order("arrival", { ascending: true });

      console.log("📊 Supabase response:", { data, error });

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log(`📋 Found ${data?.length || 0} patients in database`);

      // Transform database records to Patient type
      const transformedPatients: Patient[] = (data || []).map((record) => {
        console.log("🔄 Transforming patient record:", record);
        return {
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
        };
      });

      console.log("✅ Transformed patients:", transformedPatients);
      setPatients(transformedPatients);
    } catch (error) {
      console.error("❌ Error fetching patients:", error);
      setFetchError(
        "Failed to load patients from the database. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
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

      toast.success("Patient successfully treated and removed from queue");
      // Clear selection if the removed patient was selected
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
      fetchPatients(); // Refresh the list
    } catch (error) {
      console.error("Error removing patient:", error);
      toast.error("Failed to mark patient as treated");
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
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
            >
              <img src="/nurse_head.png" alt="TriageAI" className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">TriageAI</h1>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 relative">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </Link>
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
              <div className="flex gap-6 min-h-[600px]">
                {/* Left Sidebar - Patient Queue Container */}
                <div className="w-96 shrink-0">
                  <div className="bg-card rounded-lg border border-border shadow-lg h-full">
                    <div className="p-4 border-b border-border">
                      <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Patient Queue
                        <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {patients.length}
                        </span>
                      </h2>
                    </div>

                    {/* Scrollable Patient Queue */}
                    <div className="overflow-y-auto h-[calc(100%-5rem)] p-4">
                      <PatientQueue
                        patients={patients}
                        onPatientSelect={handlePatientSelect}
                        onPatientRemove={handlePatientRemove}
                        selectedPatientId={selectedPatient?.id}
                      />
                    </div>
                  </div>

                  {/* Error Alert - Show below patient queue container */}
                  {fetchError && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {fetchError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Main Content Area - Patient Details */}
                <div className="flex-1 min-w-0">
                  {selectedPatient ? (
                    <div className="bg-card rounded-lg border border-border shadow-lg h-full">
                      <PatientDetails patient={selectedPatient} />
                    </div>
                  ) : (
                    <div className="bg-card rounded-lg border border-border shadow-lg h-full">
                      <div className="p-6">
                        <h3 className="text-2xl font-semibold text-card-foreground mb-6 flex items-center gap-2">
                          <Activity className="w-6 h-6" />
                          Dashboard Overview
                        </h3>

                        {/* Stats Cards in Right Panel */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-lg transition-all duration-300 lg:col-span-2">
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
                                    width: `${Math.min(
                                      stats.queuePercentage,
                                      100
                                    )}%`,
                                    backgroundColor: `hsl(${
                                      120 - stats.queuePercentage * 1.2
                                    }, 70%, 50%)`,
                                  }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="mt-8 text-center">
                          <p className="text-muted-foreground">
                            Select a patient from the queue to view their
                            details, medical history, and manage their care.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
