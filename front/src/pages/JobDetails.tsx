import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type AxiosResponse, isAxiosError } from 'axios';
import axiosInstance from '../api/axiosInstance';

// ==========================================
// 1. Interfaces
// ==========================================
export interface JobDetailType {
  _id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  postedAt: string;
  projectType: string;
  salaryOrBudget: string;
  tags: string[];
  aboutJob: string;
  responsibilities: string[];
  requiredSkills: string[];
  companyDescription: string;
  matchPercentage: number;
}

interface JobDetailApiResponse {
  status: string;
  data: {
    job: JobDetailType;
  };
}

// ==========================================
// 2. Component
// ==========================================
export const JobDetails: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>(); // جلب الـ ID من الرابط
  const navigate = useNavigate();

  // --- States ---
  const [job, setJob] = useState<JobDetailType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States for the Application Form
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [applicationNote, setApplicationNote] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // --- Fetch Job Details ---
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response: AxiosResponse<JobDetailApiResponse> = await axiosInstance.get(
          `/v1/jobs/${jobId}`
        );

        setJob(response.data.data.job);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const errorMessage = err.response?.data?.message || "Failed to load job details.";
          setError(errorMessage);
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  // --- Handlers ---
  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleApply = async () => {
    if (selectedSkills.length === 0) {
      alert("Please select at least one skill to apply.");
      return;
    }

    try {
      setIsSending(true);
      await axiosInstance.post(
        `/v1/jobs/${jobId}/apply`,
        { skills: selectedSkills, note: applicationNote }
      );

      alert("Application sent successfully!");
      // Optionally navigate back or reset form
    } catch (err) {

       alert("Failed to send application. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // --- Render States ---
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark h-full">
         <span className="material-icons-round text-brand-light text-4xl animate-spin mb-4">refresh</span>
         <p className="text-gray-500 animate-pulse">Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
       <div className="flex-1 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark h-full">
         <div className="p-10 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 text-center">
            <span className="material-icons-round text-red-500 text-4xl mb-4">error_outline</span>
            <p className="text-red-600 dark:text-red-400 font-medium">{error || "Job not found"}</p>
            <button onClick={() => navigate('/jobs')} className="mt-4 text-brand-light hover:underline font-medium">
              &larr; Back to Jobs
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative bg-[#FAFAFA] dark:bg-[#171717] overflow-y-auto transition-colors duration-300 w-full h-full custom-scrollbar">
      
      {/* 1. Header Section */}
      <div className="bg-white dark:bg-[#262626] border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-6 py-10">
          
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7C3AED] mb-6 font-medium transition-colors">
            <span className="material-icons-round text-[18px]">arrow_back</span> Back to Jobs
          </button>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 bg-gray-100 dark:bg-[#171717] rounded-xl flex items-center justify-center text-3xl font-bold text-[#7C3AED] dark:text-[#8B5CF6] border border-gray-200 dark:border-white/10 shrink-0 shadow-sm overflow-hidden">
               {job.companyLogo ? (
                 <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-cover" />
               ) : (
                 job.companyName.charAt(0)
               )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">{job.title}</h1>
              <div className="flex flex-wrap gap-y-2 gap-x-4 items-center text-sm text-gray-500 dark:text-white/40">
                <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-white/60">
                  <span className="material-icons-round text-[16px]">business</span>
                  {job.companyName}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-icons-round text-[16px]">location_on</span>
                  {job.location}
                </span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <span className="material-icons-round text-[16px]">schedule</span>
                  Posted {new Date(job.postedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-3 mt-6">
                <span className="px-4 py-1 bg-gray-100 dark:bg-white/5 rounded text-xs font-bold text-gray-600 dark:text-white/40 border border-gray-200 dark:border-white/10">{job.projectType}</span>
                <span className="px-4 py-1 bg-[#7C3AED]/10 dark:bg-[#8B5CF6]/10 rounded text-xs font-bold text-[#7C3AED] dark:text-[#8B5CF6] border border-[#7C3AED]/20">{job.tags.includes('ITI') ? 'ITI Preferred' : job.salaryOrBudget}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="max-w-4xl mx-auto p-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          
          {/* About Job */}
          <section>
            <h3 className="text-xl font-bold mb-4 text-[#171717] dark:text-[#F5F5F5]">About the Job</h3>
            <p className="text-gray-600 dark:text-white/60 leading-relaxed text-md whitespace-pre-line">
              {job.aboutJob}
            </p>
          </section>

          {/* Responsibilities */}
          <section>
            <h3 className="text-xl font-bold mb-4 text-[#171717] dark:text-[#F5F5F5]">Responsibilities</h3>
            <ul className="list-disc list-outside ml-5 space-y-3 text-gray-600 dark:text-white/60">
              {job.responsibilities.map((resp, idx) => (
                 <li key={idx}>{resp}</li>
              ))}
            </ul>
          </section>

          {/* Application Form */}
          <section className="mt-10 p-6 bg-white dark:bg-[#262626] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-colors duration-300">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#171717] dark:text-[#F5F5F5]">
              <span className="material-icons-round text-[#7C3AED] dark:text-[#8B5CF6]">check_circle_outline</span>
              Confirm Your Skills
            </h3>
            <p className="text-sm text-gray-500 dark:text-white/40 mb-6">Select the skills you possess to share your profile with the team.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               {job.requiredSkills.map(skill => (
                  <label key={skill} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-[#7C3AED]/5 dark:hover:bg-[#8B5CF6]/5 cursor-pointer transition-all group">
                    <input 
                      type="checkbox" 
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      className="w-5 h-5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] dark:bg-[#171717] dark:border-white/10" 
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-white/70 group-hover:text-[#7C3AED] dark:group-hover:text-[#8B5CF6]">{skill}</span>
                  </label>
               ))}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Add a Note (Optional)</label>
              <div className="relative flex items-center">
                <textarea 
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  placeholder="Briefly explain your experience related to this role..." 
                  rows={3}
                  className="w-full bg-[#FAFAFA] dark:bg-[#171717] text-sm p-4 rounded-2xl border border-gray-200 dark:border-white/10 outline-none focus:border-[#7C3AED] dark:focus:border-[#8B5CF6] text-[#171717] dark:text-[#F5F5F5] transition-all resize-none shadow-inner"
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-50 dark:border-white/5 pt-6">
              <p className="text-[11px] text-gray-400 leading-tight max-w-[60%]">
                By clicking send, your verified profile and selected skills will be shared with the publisher.
              </p>
              <button 
                onClick={handleApply}
                disabled={isSending || selectedSkills.length === 0}
                className="flex items-center gap-2 px-8 py-3 bg-[#7C3AED] dark:bg-[#8B5CF6] text-white rounded-xl font-bold shadow-lg shadow-[#7C3AED]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <span>{isSending ? 'Sending...' : 'Send Details'}</span>
                {!isSending && <span className="material-icons-round text-[18px]">send</span>}
              </button>
            </div>
          </section>
        </div>

        {/* 3. Sidebar Insights */}
        <div className="space-y-6">
          <div className="bg-[#7C3AED]/5 dark:bg-[#8B5CF6]/5 p-5 rounded-2xl border border-[#7C3AED]/20 dark:border-[#8B5CF6]/20">
            <h4 className="font-bold text-[#7C3AED] dark:text-[#8B5CF6] flex items-center gap-2 mb-3">
              <span className="material-icons-round text-[20px]">bolt</span>
              Rabta Insight
            </h4>
            <p className="text-sm text-gray-600 dark:text-white/50 leading-snug">
              Based on your profile, you have <strong>{job.matchPercentage}%</strong> of the skills required for this position.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-[#262626] rounded-2xl border border-gray-100 dark:border-white/5 transition-colors duration-300">
            <h4 className="font-bold mb-3 text-[#171717] dark:text-[#F5F5F5]">About the Company</h4>
            <p className="text-xs text-gray-500 dark:text-white/40 mb-4 leading-relaxed">
              {job.companyDescription}
            </p>
            <button
              onClick={() => navigate(`/employer/${encodeURIComponent(job.companyName)}`)}
              className="w-full py-2 border border-[#7C3AED] dark:border-[#8B5CF6] text-[#7C3AED] dark:text-[#8B5CF6] text-xs font-bold rounded-full hover:bg-[#7C3AED] hover:text-white dark:hover:bg-[#8B5CF6] transition-all"
            >
              View Company Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};