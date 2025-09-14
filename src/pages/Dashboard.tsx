import { useState, useMemo, useEffect } from "react";
import { PatientQueue } from "@/components/PatientQueue";
import { PatientDetails } from "@/components/PatientDetails";
import { TypingText } from "@/components/TypingText";
import { Patient, getTriageLabel } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Activity,
  Users,
  Clock,
  TrendingUp,
  UserCheck,
  PieChart as PieChartIcon,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement
);

interface AISummary {
  summary: string;
  cached: boolean;
  timestamp: string;
}

const Dashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [queueSummary, setQueueSummary] = useState<string>("");
  const [loadingQueueSummary, setLoadingQueueSummary] = useState(false);

  // Triage level colors matching patient queue (from CSS variables)
  const triageColors = {
    1: "hsl(0, 84%, 50%)", // Critical - Red
    2: "hsl(25, 95%, 53%)", // Urgent - Orange
    3: "hsl(48, 95%, 53%)", // Less Urgent - Yellow
    4: "hsl(142, 71%, 45%)", // Minor - Green
    5: "hsl(0, 35%, 85%)", // Non-urgent - Light Rose
  };

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

      // Hardcoded medications and allergies for demo
      const medicationOptions = [
        "Lisinopril 10mg", "Metformin 500mg", "Atorvastatin 20mg", "Levothyroxine 50mcg",
        "Amlodipine 5mg", "Omeprazole 20mg", "Metoprolol 25mg", "Losartan 50mg",
        "Hydrochlorothiazide 25mg", "Simvastatin 40mg", "Albuterol Inhaler",
        "Gabapentin 300mg", "Tramadol 50mg", "Ibuprofen 600mg", "Acetaminophen 500mg"
      ];

      const allergyOptions = [
        "Penicillin", "Peanuts", "Shellfish", "Latex", "Aspirin", "Sulfa drugs",
        "Tree nuts", "Eggs", "Milk", "Codeine", "Iodine", "Morphine", "Bees/Wasps"
      ];

      // Function to get random items from array
      const getRandomItems = (array: string[], count: number): string[] => {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      };

      // Transform database records to Patient type
      const transformedPatients: Patient[] = (data || []).map((record) => {
        console.log("🔄 Transforming patient record:", record);

        // Generate random medications and allergies (0-4 each)
        const randomMedCount = Math.floor(Math.random() * 5); // 0-4
        const randomAllergyCount = Math.floor(Math.random() * 4); // 0-3

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
            respiratoryRate: record.respiratory_rate,
            painLevel: record.pain_level || 5, // Default to 5 if not set
          },
          allergies: getRandomItems(allergyOptions, randomAllergyCount),
          medications: getRandomItems(medicationOptions, randomMedCount),
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

    // Calculate triage level distribution for pie chart
    const triageCounts = [1, 2, 3, 4, 5]
      .map((level) => ({
        name: getTriageLabel(level as 1 | 2 | 3 | 4 | 5),
        value: patients.filter((p) => p.triageLevel === level).length,
        level: level,
      }))
      .filter((item) => item.value > 0); // Only include levels with patients

    // Calculate individual wait times for each patient (sorted by wait time)
    const waitTimeData = waitingPatients
      .map((p) => ({
        name: p.name,
        waitTime: Math.round(
          (Date.now() - p.arrivalTime.getTime()) / (1000 * 60)
        ), // in minutes
        triageLevel: p.triageLevel,
      }))
      .sort((a, b) => a.waitTime - b.waitTime); // Sort by wait time (ascending)

    return {
      totalWaiting,
      avgWaitTime: Math.round(avgWaitTime),
      queuePercentage,
      maxCapacity,
      triageDistribution: triageCounts,
      waitTimeData,
    };
  }, [patients]);

  const fetchQueueManagementSummary = async (forceRefresh = false) => {
    setLoadingQueueSummary(true);

    try {
      const queueData = {
        patients: patients.map(p => ({
          name: p.name,
          triage_level: p.triageLevel,
          pain_level: p.vitals.painLevel,
          heart_rate: p.vitals.heartRate,
          respiratory_rate: p.vitals.respiratoryRate,
        })),
        total_patients: stats.totalWaiting,
        queue_percentage: stats.queuePercentage,
        avg_wait_time: stats.avgWaitTime,
      };

      const refreshParam = forceRefresh ? "?refresh=true" : "";

      const response = await fetch(
        `http://localhost:8001/api/v1/ai-summaries/queue-management${refreshParam}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(queueData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch queue management summary");
      }

      const data: AISummary = await response.json();
      setQueueSummary(data.summary);
    } catch (error) {
      console.error("Error fetching queue management summary:", error);
      setQueueSummary("Unable to generate queue management recommendations at this time. Please try again later.");
    } finally {
      setLoadingQueueSummary(false);
    }
  };

  // Load queue summary when patients change
  useEffect(() => {
    if (patients.length > 0 && !loading) {
      fetchQueueManagementSummary();
    }
  }, [patients.length, loading]);

  // Chart.js configuration (after stats is defined)
  const pieChartData = {
    labels: stats.triageDistribution.map((item) => item.name),
    datasets: [
      {
        data: stats.triageDistribution.map((item) => item.value),
        backgroundColor: stats.triageDistribution.map(
          (item) => triageColors[item.level as keyof typeof triageColors]
        ),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  // Wait time chart configuration
  const waitTimeChartData = {
    labels: stats.waitTimeData.map((item) => item.name),
    datasets: [
      {
        type: "bar" as const,
        data: stats.waitTimeData.map((item) => item.waitTime),
        backgroundColor: stats.waitTimeData.map(
          (item) => triageColors[item.triageLevel]
        ),
        borderColor: stats.waitTimeData.map(
          (item) => triageColors[item.triageLevel]
        ),
        borderWidth: 1,
      },
      {
        type: "line" as const,
        label: "Average Wait Time",
        data: Array(stats.waitTimeData.length).fill(stats.avgWaitTime),
        borderColor: "#ef4444",
        borderWidth: 3,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const waitTimeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          filter: function (legendItem: any) {
            // Only show the "Average Wait Time" legend item, hide the bar chart legend
            return legendItem.text === "Average Wait Time";
          },
        },
      },
      tooltip: {
        filter: function (tooltipItem: any) {
          // Hide tooltip for the average line points
          return tooltipItem.datasetIndex !== 1;
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Wait Time (minutes)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Patients (sorted by wait time)",
        },
      },
    },
  };

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
              <div className="flex gap-6 h-[calc(100vh-12rem)]">
                {/* Left Sidebar - Patient Queue Container */}
                <div className="w-96 shrink-0">
                  <div className="bg-card rounded-lg border border-border shadow-lg h-full flex flex-col">
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
                    <div className="overflow-y-auto flex-1 p-4">
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
                    <div className="bg-card rounded-lg border border-border shadow-lg h-full flex flex-col">
                      <div className="p-4 border-b border-border">
                        <h3 className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                          <Activity className="w-6 h-6" />
                          Dashboard Overview
                        </h3>
                      </div>

                      {/* Scrollable Dashboard Content */}
                      <div className="overflow-y-auto flex-1 p-6">
                        {/* Dashboard Content */}
                        <div className="space-y-6">
                          {/* Charts Row */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Triage Distribution Pie Chart - Made Smaller */}
                            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <PieChartIcon className="w-5 h-5 text-primary" />
                                  <h4 className="text-lg font-semibold">
                                    Triage Distribution
                                  </h4>
                                </div>
                                {stats.triageDistribution.length > 0 ? (
                                  <div className="h-48 w-full">
                                    {pieChartData.datasets[0].data.length >
                                      0 && (
                                      <div
                                        style={{
                                          position: "relative",
                                          height: "100%",
                                          width: "100%",
                                        }}
                                      >
                                        <Pie
                                          data={pieChartData}
                                          options={pieChartOptions}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                                    No patients in queue
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Wait Times Chart - New */}
                            <Card className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                  <h4 className="text-lg font-semibold">
                                    Patient Wait Times
                                  </h4>
                                  <span className="text-sm text-muted-foreground">
                                    (sorted by wait time)
                                  </span>
                                </div>
                                {stats.waitTimeData.length > 0 ? (
                                  <div className="h-48 w-full">
                                    <Bar
                                      data={waitTimeChartData}
                                      options={waitTimeChartOptions}
                                    />
                                  </div>
                                ) : (
                                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                                    No patients currently waiting
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {/* Stats Cards */}
                          <div className="flex gap-6">
                            <Card className="w-1/4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all duration-300">
                              <CardContent className="p-6">
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

                            <Card className="w-3/4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-lg transition-all duration-300">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                      Queue Load (Maximum capacity:{" "}
                                      {stats.maxCapacity})
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
                        </div>

                        {/* AI Queue Management Summary */}
                        <Card className="mt-8 overflow-hidden border-2 border-purple-200">
                          <CardHeader className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                AI Queue Management Recommendations
                              </div>
                              <Button
                                onClick={() => fetchQueueManagementSummary(true)}
                                disabled={loadingQueueSummary}
                                size="sm"
                                variant="secondary"
                                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                              >
                                {loadingQueueSummary ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            {loadingQueueSummary ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="text-center space-y-3">
                                  <Loader2 className="w-8 h-8 text-purple-600 mx-auto animate-spin" />
                                  <p className="text-purple-600 font-medium">Generating queue management recommendations...</p>
                                  <p className="text-sm text-muted-foreground">
                                    Analyzing patient queue and staffing needs
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                    <p className="text-sm font-semibold text-purple-900 uppercase tracking-wide">
                                      AI Queue Management Strategy
                                    </p>
                                  </div>
                                  <div className="prose prose-sm text-purple-900 leading-relaxed">
                                    {queueSummary ? (
                                      <TypingText
                                        text={queueSummary}
                                        speed={25}
                                        startDelay={300}
                                        className="text-purple-900 leading-relaxed"
                                      />
                                    ) : (
                                      <p className="text-center text-muted-foreground">
                                        Select a patient from the queue to view their details, medical history, and manage their care.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
