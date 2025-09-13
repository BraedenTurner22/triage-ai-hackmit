import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Patient, TriageLevel, Vitals } from '@/types/patient';
import { Video, Save, AlertCircle, Plus, X } from 'lucide-react';

interface EDDashboardProps {
  onPatientAdd: (patient: Patient) => void;
}

export function EDDashboard({ onPatientAdd }: EDDashboardProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male' as Patient['gender'],
    chiefComplaint: '',
    heartRate: '',
    systolic: '',
    diastolic: '',
    oxygenSaturation: '',
    temperature: '',
    respiratoryRate: '',
    medicalHistory: [] as string[],
  });

  const [newHistory, setNewHistory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vitals: Vitals = {
      heartRate: parseInt(formData.heartRate) || 0,
      bloodPressure: {
        systolic: parseInt(formData.systolic) || 0,
        diastolic: parseInt(formData.diastolic) || 0,
      },
      oxygenSaturation: parseInt(formData.oxygenSaturation) || 0,
      temperature: parseFloat(formData.temperature) || 0,
      respiratoryRate: parseInt(formData.respiratoryRate) || 0,
    };

    // Automatically assign triage level based on vitals (simple rule-based system)
    let triageLevel: TriageLevel = 5;
    if (parseInt(formData.heartRate) > 120 || parseInt(formData.systolic) > 180 || parseInt(formData.oxygenSaturation) < 90) {
      triageLevel = 2;
    } else if (parseInt(formData.heartRate) > 100 || parseInt(formData.systolic) > 160 || parseInt(formData.oxygenSaturation) < 95) {
      triageLevel = 3;
    } else if (parseInt(formData.heartRate) > 90 || parseInt(formData.systolic) > 140) {
      triageLevel = 4;
    }

    const newPatient: Patient = {
      id: `PAT-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      arrivalTime: new Date(),
      triageLevel,
      chiefComplaint: formData.chiefComplaint,
      vitals,
      allergies: [],
      medications: [],
      medicalHistory: formData.medicalHistory,
      notes: '',
      status: 'waiting',
      aiSummary: 'AI analysis in progress... Patient presents with symptoms requiring immediate attention based on vital signs and triage assessment.',
    };

    onPatientAdd(newPatient);
    
    toast({
      title: "Patient Added",
      description: `${newPatient.name} has been added to the queue with triage level ${newPatient.triageLevel}.`,
    });

    // Reset form
    setFormData({
      name: '',
      age: '',
      gender: 'Male',
      chiefComplaint: '',
      heartRate: '',
      systolic: '',
      diastolic: '',
      oxygenSaturation: '',
      temperature: '',
      respiratoryRate: '',
      medicalHistory: [],
    });
  };

  const addHistory = () => {
    if (newHistory) {
      setFormData({ ...formData, medicalHistory: [...formData.medicalHistory, newHistory] });
      setNewHistory('');
    }
  };

  const removeHistory = (index: number) => {
    setFormData({ ...formData, medicalHistory: formData.medicalHistory.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Video Stream Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Patient Video Stream (VLM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center">
              <Video className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Video stream will appear here</p>
              <p className="text-sm text-muted-foreground mt-1">VLM model integration ready</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Patient Information Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Patient Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value as Patient['gender'] })}
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

            {/* Chief Complaint */}
            <div className="space-y-2">
              <Label htmlFor="complaint">Chief Complaint</Label>
              <Textarea
                id="complaint"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                placeholder="Describe the patient's main concern..."
                required
                rows={3}
              />
            </div>

            {/* Vitals */}
            <div className="space-y-2">
              <Label>Vital Signs</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heartRate" className="text-sm">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Blood Pressure</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Sys"
                      value={formData.systolic}
                      onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Dia"
                      value={formData.diastolic}
                      onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oxygen" className="text-sm">O2 Saturation (%)</Label>
                  <Input
                    id="oxygen"
                    type="number"
                    value={formData.oxygenSaturation}
                    onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temp" className="text-sm">Temperature (°C)</Label>
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="respRate" className="text-sm">Respiratory Rate</Label>
                  <Input
                    id="respRate"
                    type="number"
                    value={formData.respiratoryRate}
                    onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Medical History (Optional) */}
            <div className="space-y-2">
              <Label>Medical History (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newHistory}
                  onChange={(e) => setNewHistory(e.target.value)}
                  placeholder="Enter medical history item"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHistory())}
                />
                <Button type="button" onClick={addHistory} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.medicalHistory.map((item, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    {item}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeHistory(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              <Save className="w-4 h-4 mr-2" />
              Add Patient to Queue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}