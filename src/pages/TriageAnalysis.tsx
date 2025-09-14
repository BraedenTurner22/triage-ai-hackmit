import { EDDashboard } from "@/components/EDDashboard";
import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { Patient } from "@/types/patient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TriageAnalysis = () => {
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
        pain_level: newPatient.vitals.painLevel,
      });

      if (error) throw error;

      toast.success("Patient added successfully");
    } catch (error) {
      console.error("Error adding patient:", error);
      toast.error("Failed to add patient");
    }
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
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
          <EDDashboard onPatientAdd={handlePatientAdd} />
        </div>
      </div>
    </div>
  );
};

export default TriageAnalysis;
