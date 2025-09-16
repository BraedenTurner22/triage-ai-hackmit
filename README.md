# TriageAI - AI-Powered Emergency Room Triage System

TriageAI is a comprehensive medical triage application that leverages artificial intelligence to streamline emergency room operations, reduce wait times, and improve patient care quality. The system provides real-time patient monitoring, AI-powered triage assessments, voice interaction capabilities, and clinical decision support.

## 🚀 Features

### 🏥 **Nurse Dashboard**
- **Real-time Patient Queue**: Monitor all patients with live updates
- **Patient Vitals Tracking**: Heart rate, respiratory rate, and pain level monitoring
- **Triage Priority Management**: AI-assisted priority assignment (1-5 scale)
- **Patient Details View**: Comprehensive patient information and medical history
- **Live Statistics**: Queue metrics, average wait times, and triage distribution

### 🎤 **AI-Powered Triage Analysis**
- **Voice-Interactive Triage**: Natural language conversation with patients
- **Intelligent Assessment**: AI analyzes symptoms and assigns triage levels
- **Real-time Transcription**: Automatic speech-to-text conversion
- **Pain Assessment**: Comprehensive pain level evaluation
- **Vital Signs Collection**: Automated collection of heart rate and respiratory rate

### 🧠 **DoctorAid Clinical Support**
- **Real-time Transcription**: Live speech-to-text for patient consultations
- **Clinical Suggestions**: AI-powered recommendations for treatment protocols
- **Voice Commands**: Hands-free operation during procedures
- **Medical Decision Support**: Evidence-based clinical guidance

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Chart.js** for data visualization
- **Supabase** for real-time database

### Backend
- **FastAPI** with Python
- **Supabase** for database and real-time features
- **OpenAI API** for AI processing
- **ElevenLabs** for text-to-speech
- **Deepgram** for speech-to-text
- **WebSocket** for real-time communication

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Python** (v3.8 or higher)
- **Git**
- **Supabase Account** - [Sign up here](https://supabase.com)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
- **ElevenLabs API Key** (optional, for voice features) - [Get one here](https://elevenlabs.io)
- **Deepgram API Key** (optional, for speech recognition) - [Get one here](https://deepgram.com)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd triage-ai-hackmit
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_VOICE_API_KEY=your_openai_api_key

# Voice Services (Optional)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
```

### 3. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Set Up Database

1. Create a new Supabase project
2. Run the following SQL to create the patients table:

```sql
CREATE TABLE patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    arrival TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    triage_level INTEGER NOT NULL CHECK (triage_level >= 1 AND triage_level <= 5),
    patient_summary TEXT,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    pain_level INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Start the Application

#### Start the Backend Server
```bash
cd backend
python run.py
```
The backend will be available at `http://localhost:8001`

#### Start the Frontend Development Server
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`

## 📖 How to Use the Application

### 🏠 **Homepage Access**

1. Open your browser and navigate to `http://localhost:5173`
2. You'll see three main options:
   - **Nurse Dashboard** (password protected)
   - **Begin Triage Analysis** (public access)
   - **DoctorAid** (public access)

### 🏥 **Nurse Dashboard**

**Access**: Click "Nurse Dashboard" and enter password: `huzz`

**Features**:
- **Patient Queue**: View all patients in real-time
- **Patient Details**: Click on any patient to see full information
- **Vitals Monitoring**: Track heart rate, respiratory rate, and pain levels
- **Triage Management**: Update patient priorities and status
- **Statistics**: View queue metrics and performance data

**How to Use**:
1. Enter the password to access the dashboard
2. Monitor the patient queue on the left panel
3. Click on any patient to view detailed information
4. Use the controls to update patient status or priority
5. View real-time statistics and charts

### 🎤 **Triage Analysis**

**Access**: Click "Begin Triage Analysis" (no password required)

**Features**:
- **Voice Interaction**: Speak naturally with the AI system
- **Symptom Assessment**: Describe symptoms in your own words
- **Pain Evaluation**: Rate pain levels using voice or interface
- **Vital Signs**: Input heart rate and respiratory rate
- **AI Triage**: Automatic priority assignment based on assessment

**How to Use**:
1. Click "Begin Triage Analysis"
2. Follow the voice prompts or use the text interface
3. Describe your symptoms when prompted
4. Rate your pain level (1-10 scale)
5. Input vital signs if available
6. Review the AI-generated triage assessment
7. The patient will be automatically added to the queue

### 🧠 **DoctorAid**

**Access**: Click "DoctorAid" (no password required)

**Features**:
- **Real-time Transcription**: Live speech-to-text during consultations
- **Clinical Suggestions**: AI-powered treatment recommendations
- **Voice Commands**: Hands-free operation
- **Medical Decision Support**: Evidence-based guidance

**How to Use**:
1. Click "DoctorAid" to access the clinical support tool
2. Enable microphone permissions when prompted
3. Speak naturally - your speech will be transcribed in real-time
4. Review AI-generated clinical suggestions
5. Use voice commands for hands-free operation

## 🔧 API Documentation

### Backend Endpoints

The backend API is available at `http://localhost:8001/api/v1`

#### Patient Management
- `GET /patients/` - Get all patients
- `POST /patients/` - Create a new patient
- `GET /patients/{id}` - Get specific patient
- `PUT /patients/{id}` - Update patient
- `DELETE /patients/{id}` - Delete patient

#### Triage System
- `POST /triage/start` - Start new triage session
- `POST /triage/sessions/{id}/voice` - Process voice input
- `POST /triage/sessions/{id}/speech` - Generate speech response
- `GET /triage/sessions/{id}/status` - Get session status
- `DELETE /triage/sessions/{id}` - End session

#### Health Check
- `GET /health` - API health status

## 🚀 Deployment

### Frontend Deployment
```bash
npm run build
```
Deploy the `dist` folder to your preferred hosting service.

### Backend Deployment
The FastAPI backend can be deployed to any Python hosting service that supports WSGI/ASGI applications.

## 🔒 Security Notes

- The nurse dashboard is password-protected (password: `huzz`)
- API keys should be kept secure and not committed to version control
- In production, implement proper authentication and authorization
- Use HTTPS for all communications
- Regularly update dependencies for security patches

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support or questions:
1. Check the API documentation
2. Review the console logs for error messages
3. Ensure all environment variables are properly set
4. Verify database connectivity

## 📚 Research References

### Computer Vision Models

**rPPG (Remote Photoplethysmography) for Heart Rate Detection**
- **Paper**: [rPPG-Toolbox: Deep Remote PPG Toolbox](https://arxiv.org/abs/2210.00716)
- **GitHub**: [ubicomplab/rPPG-Toolbox](https://github.com/ubicomplab/rPPG-Toolbox)
- **Conference**: NeurIPS 2023
- **Authors**: Liu, Xin et al.

This research enables contactless heart rate monitoring using computer vision techniques to analyze subtle color changes in facial skin caused by blood flow.

**Citation**:
```bibtex
@article{liu2022rppg,
  title={rPPG-Toolbox: Deep Remote PPG Toolbox},
  author={Liu, Xin and Narayanswamy, Girish and Paruchuri, Akshay and Zhang, Xiaoyu and Tang, Jiankai and Zhang, Yuzhe and Wang, Yuntao and Sengupta, Soumyadip and Patel, Shwetak and McDuff, Daniel},
  journal={arXiv preprint arXiv:2210.00716},
  year={2022}
}
```

## 🔄 Updates

The application includes real-time updates for:
- Patient queue changes
- Vital signs monitoring
- Triage priority updates
- Live statistics

All updates are automatically synchronized across all connected clients.
