import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Users, ClipboardList, Lock } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Index = () => {
  const [password, setPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handlePasswordSubmit = () => {
    // Simple password check - in a real app, this would be more secure
    if (password === "huzz") {
      setIsDialogOpen(false);
      setPassword("");
      setError("");
      navigate("/dashboard");
    } else {
      setError("Invalid password. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePasswordSubmit();
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
            <img src="/nurse_head.png" alt="TriageAI" className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TriageAI</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 relative">
        <div className="flex flex-col items-center justify-center min-h-[70vh] relative">
          {/* Content */}
          <div className="relative z-10 text-center space-y-6 mt-8">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-red-900 italic animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                Lightning-Fast Emergency Care
              </h1>
            </div>
            <p className="text-xl text-red-700 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out mb-0">
              Minimize ER wait times without compromising on quality.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl relative z-10 items-center -mt-24">
            {/* Nurse Dashboard Card */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Card className="h-80 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-300">
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
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Nurse Dashboard Access
                  </DialogTitle>
                  <DialogDescription>
                    Please enter the nurse password to access the dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter nurse password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(""); // Clear error when typing
                      }}
                      onKeyPress={handleKeyPress}
                      className="w-full"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 mt-2">{error}</p>
                  )}
                </div>
                <DialogFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setPassword("");
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handlePasswordSubmit}>
                    Access Dashboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Nurse Image */}
            <div className="flex justify-center mt-8">
              <img
                src="/nurse.png"
                alt="Professional nurse"
                className="max-w-full h-auto max-h-120 object-contain drop-shadow-lg opacity-80"
              />
            </div>

            {/* Triage Analysis Card */}
            <Link to="/triage-analysis">
              <Card className="h-80 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 hover:border-red-300">
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
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
