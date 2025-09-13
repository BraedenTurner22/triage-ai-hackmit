-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  arrival TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  patient_summary TEXT,
  triage_level INTEGER NOT NULL CHECK (triage_level BETWEEN 1 AND 5),
  heart_rate INTEGER NOT NULL,
  respiratory_rate INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for now, since no auth is implemented)
CREATE POLICY "Public can view all patients" 
ON public.patients 
FOR SELECT 
USING (true);

-- Create policy for public insert access (for now, since no auth is implemented)
CREATE POLICY "Public can insert patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (true);

-- Create policy for public update access (for now, since no auth is implemented)
CREATE POLICY "Public can update patients" 
ON public.patients 
FOR UPDATE 
USING (true);

-- Create policy for public delete access (for now, since no auth is implemented)
CREATE POLICY "Public can delete patients" 
ON public.patients 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();