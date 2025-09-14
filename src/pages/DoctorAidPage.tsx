import { DoctorAid } from "@/components/DoctorAid";
import { Link } from "react-router-dom";

const DoctorAidPage = () => {
  return (
    <div className="min-h-screen relative bg-gray-50">
      {/* Header */}
      <header className="bg-white text-red-900 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200"
            >
              <img src="/nurse_head.png" alt="TriageAI" className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-800">TriageAI</h1>
              </div>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 relative">
        <DoctorAid />
      </main>
    </div>
  );
};

export default DoctorAidPage;
