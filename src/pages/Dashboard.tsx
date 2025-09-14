import { useState, useMemo, useEffect } from "react";
import { PatientQueue } from "@/components/PatientQueue";
import { PatientDetails } from "@/components/PatientDetails";
import { Patient, getTriageLabel } from "@/types/patient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Brain,
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

const Dashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
            respiratoryRate: record.respiratory_rate,
            painLevel: record.pain_level || 5, // Default to 5 if not set
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
    layout: {
      padding: {
        left: 20,
        right: 10,
        top: 10,
        bottom: 10,
      },
    },
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
        ticks: {
          maxTicksLimit: 6,
        },
      },
      x: {
        title: {
          display: true,
          text: "Patients (sorted by wait time)",
        },
        ticks: {
          maxRotation: 45,
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
                      <div className="p-6 border-b border-border">
                        <h3 className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
                          <Activity className="w-6 h-6" />
                          Dashboard Overview
                        </h3>
                      </div>
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
                                  <div className="h-56 w-full">
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

                        <div className="mt-8">
                          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                            <CardHeader>
                              <CardTitle className="text-xl flex items-center gap-2">
                                <Brain className="w-6 h-6 text-blue-600" />
                                AI Management Plan
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="bg-white/80 rounded-lg p-4 border border-blue-200">
                                <p className="text-gray-800 leading-relaxed">
                                  Based on current patient queue analysis,
                                  prioritize the{" "}
                                  {stats.triageDistribution.find(
                                    (item) => item.level === 1
                                  )?.value || 0}{" "}
                                  critical cases immediately. Consider grouping
                                  similar symptoms for efficient care delivery
                                  and prepare discharge protocols for{" "}
                                  {(stats.triageDistribution.find(
                                    (item) => item.level === 4
                                  )?.value || 0) +
                                    (stats.triageDistribution.find(
                                      (item) => item.level === 5
                                    )?.value || 0)}{" "}
                                  low-priority patients. Current average wait
                                  time of {stats.avgWaitTime} minutes suggests
                                  implementing fast-track protocols for minor
                                  cases. Monitor bed capacity at{" "}
                                  {stats.queuePercentage}% to prevent
                                  bottlenecks and ensure optimal patient flow
                                  throughout the shift.
                                </p>
                              </div>
                              <div className="mt-4 flex items-center justify-between text-sm text-blue-600">
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  AI Analysis Updated
                                </span>
                                <span>{new Date().toLocaleTimeString()}</span>
                              </div>
                            </CardContent>
                          </Card>
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
