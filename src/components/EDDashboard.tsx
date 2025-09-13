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
    triageLevel: 3 as TriageLevel,
    chiefComplaint: '',
    heartRate: '',
    systolic: '',
    diastolic: '',
    oxygenSaturation: '',
    temperature: '',
    respiratoryRate: '',
    allergies: [] as string[],
    medications: [] as string[],
    medicalHistory: [] as string[],
    notes: '',
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
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

    const newPatient: Patient = {
      id: `PAT-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      arrivalTime: new Date(),
      triageLevel: formData.triageLevel,
      chiefComplaint: formData.chiefComplaint,
      vitals,
      allergies: formData.allergies,
      medications: formData.medications,
      medicalHistory: formData.medicalHistory,
      notes: formData.notes,
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
      triageLevel: 3,
      chiefComplaint: '',
      heartRate: '',
      systolic: '',
      diastolic: '',
      oxygenSaturation: '',
      temperature: '',
      respiratoryRate: '',
      allergies: [],
      medications: [],
      medicalHistory: [],
      notes: '',
    });
  };

  const addItem = (type: 'allergy' | 'medication' | 'history') => {
    if (type === 'allergy' && newAllergy) {
      setFormData({ ...formData, allergies: [...formData.allergies, newAllergy] });
      setNewAllergy('');
    } else if (type === 'medication' && newMedication) {
      setFormData({ ...formData, medications: [...formData.medications, newMedication] });
      setNewMedication('');
    } else if (type === 'history' && newHistory) {
      setFormData({ ...formData, medicalHistory: [...formData.medicalHistory, newHistory] });
      setNewHistory('');
    }
  };

  const removeItem = (type: 'allergy' | 'medication' | 'history', index: number) => {
    if (type === 'allergy') {
      setFormData({ ...formData, allergies: formData.allergies.filter((_, i) => i !== index) });
    } else if (type === 'medication') {
      setFormData({ ...formData, medications: formData.medications.filter((_, i) => i !== index) });
    } else if (type === 'history') {
      setFormData({ ...formData, medicalHistory: formData.medicalHistory.filter((_, i) => i !== index) });
    }
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

            {/* Triage and Chief Complaint */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="triage">Triage Level</Label>
                <Select
                  value={formData.triageLevel.toString()}
                  onValueChange={(value) => setFormData({ ...formData, triageLevel: parseInt(value) as TriageLevel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-triage-1" />
                        1 - Resuscitation
                      </span>
                    </SelectItem>
                    <SelectItem value="2">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-triage-2" />
                        2 - Emergent
                      </span>
                    </SelectItem>
                    <SelectItem value="3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-triage-3" />
                        3 - Urgent
                      </span>
                    </SelectItem>
                    <SelectItem value="4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-triage-4" />
                        4 - Less Urgent
                      </span>
                    </SelectItem>
                    <SelectItem value="5">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-triage-5" />
                        5 - Non-Urgent
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaint">Chief Complaint</Label>
                <Textarea
                  id="complaint"
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                  placeholder="Describe the patient's main concern..."
                  required
                />
              </div>
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

            {/* Allergies */}
            <div className="space-y-2">
              <Label>Allergies</Label>
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Enter allergy"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('allergy'))}
                />
                <Button type="button" onClick={() => addItem('allergy')} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive" className="flex items-center gap-1">
                    {allergy}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeItem('allergy', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Medications */}
            <div className="space-y-2">
              <Label>Current Medications</Label>
              <div className="flex gap-2">
                <Input
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Enter medication"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('medication'))}
                />
                <Button type="button" onClick={() => addItem('medication')} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.medications.map((med, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {med}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeItem('medication', index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional clinical observations..."
                rows={3}
              />
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