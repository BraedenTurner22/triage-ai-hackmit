import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Patient, Vitals } from "@/types/patient";
import { Video, AlertCircle } from "lucide-react";

interface EDDashboardProps {
  onPatientAdd: (patient: Patient) => void;
}

export function EDDashboard({ onPatientAdd }: EDDashboardProps) {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male" as Patient["gender"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Default vitals for basic patient entry
    const vitals: Vitals = {
      heartRate: 80,
      bloodPressure: {
        systolic: 120,
        diastolic: 80,
      },
      oxygenSaturation: 98,
      temperature: 37.0,
      respiratoryRate: 16,
    };

    const newPatient: Patient = {
      id: `PAT-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      arrivalTime: new Date(),
      triageLevel: 5, // Default to lowest priority, will be updated by AI analysis
      chiefComplaint: "Initial assessment pending",
      vitals,
      allergies: [],
      medications: [],
      medicalHistory: [],
      notes: "",
      status: "waiting",
      aiSummary: "Patient registered. Video analysis will begin shortly.",
    };

    onPatientAdd(newPatient);

    toast({
      title: "Triage Analysis Started",
      description: `Beginning triage analysis for ${newPatient.name}.`,
    });

    // Reset form
    setFormData({
      name: "",
      age: "",
      gender: "Male",
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Patient Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter patient's full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Enter patient's age"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Sex</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gender: value as Patient["gender"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              <Video className="w-4 h-4 mr-2" />
              Begin Triage Analysis
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
