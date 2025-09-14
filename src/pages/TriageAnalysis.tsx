import { CleanTriageInterface } from "@/components/CleanTriageInterface";
import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { Patient } from "@/types/patient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TriageAnalysis = () => {
  const handlePatientAdd = async (patientInfo: any) => {
    try {
      console.log("🏥 Received patient data for database save:", patientInfo);

      // Convert the patient info to the proper Patient format
      const patientData: Partial<Patient> = {
        name: patientInfo.name || 'Unknown Patient',
        age: parseInt(patientInfo.age) || 0,
        gender: patientInfo.gender || 'Other',
        arrivalTime: new Date(),
        triageLevel: patientInfo.triage_level || 3,
        chiefComplaint: patientInfo.symptoms || 'No symptoms provided',
        vitals: {
          heartRate: 80, // Default - could be enhanced later
          respiratoryRate: 16, // Default - could be enhanced later
          painLevel: patientInfo.pain_assessment?.medical_pain_level || 1
        },
        painAssessment: patientInfo.pain_assessment || null,
        allergies: [],
        medications: [],
        medicalHistory: [],
        notes: `Triage completed via AI system. Patient ID: ${patientInfo.patient_id || 'N/A'}`,
        status: 'waiting'
      };

      console.log("🏥 Formatted patient data for Supabase:", patientData);

      // Save to Supabase
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Patient successfully saved to database:", data);

      const patientName = patientInfo.name || 'Patient';
      const patientAge = patientInfo.age || 'Unknown age';
      const triageLevel = patientInfo.triage_level || 'Unknown priority';
      const painLevel = patientInfo.pain_assessment?.medical_pain_level || 'No pain data';

      toast.success(`${patientName} (${patientAge}) added to queue with priority ${triageLevel} and pain level ${painLevel}/10`);

      // Log the pain assessment data specifically
      if (patientInfo.pain_assessment) {
        console.log("💊 Pain assessment data saved:", patientInfo.pain_assessment);
      } else {
        console.warn("⚠️ No pain assessment data received from CleanTriageInterface");
      }

    } catch (error) {
      console.error("❌ Error saving patient to database:", error);
      toast.error("Error saving patient information to database");
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
          <CleanTriageInterface onPatientAdd={handlePatientAdd} />
        </div>
      </div>
    </div>
  );
};

export default TriageAnalysis;
