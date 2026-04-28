import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';

const EmployerProfile: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header / Cover Area */}
        <div className="relative bg-white dark:bg-[#262626] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden mb-8">
          <div className="h-48 bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] opacity-90"></div>
          <div className="px-8 pb-8">
            <div className="relative -mt-16 mb-6 flex flex-col md:flex-row md:items-end gap-6">
              <div className="w-32 h-32 bg-white dark:bg-[#171717] rounded-3xl p-1 shadow-xl border-4 border-white dark:border-[#262626] overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-[#1f1f1f] flex items-center justify-center text-[#7C3AED] text-4xl font-black">
                    {user?.fullName?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 mb-2">
                <h1 className="text-3xl font-black">{user?.fullName || 'Company Name'}</h1>
                <p className="text-[#7C3AED] dark:text-[#8B5CF6] font-bold flex items-center gap-2">
                  <span className="material-icons-round text-sm">verified</span>
                  Official Partner
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/employer-dashboard')}
                  className="px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#7C3AED]/20"
                >
                  <span className="material-icons-round text-sm">dashboard</span>
                  Go to Dashboard
                </button>
                <button 
                  onClick={() => navigate('/edit-profile')}
                  className="px-6 py-3 bg-white dark:bg-[#171717] border-2 border-gray-100 dark:border-white/5 hover:border-[#7C3AED] dark:hover:border-[#7C3AED] rounded-2xl font-bold transition-all flex items-center gap-2"
                >
                  <span className="material-icons-round text-sm">edit</span>
                  Edit Company
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-gray-100 dark:border-white/5 pt-8">
              <div className="md:col-span-2 space-y-8">
                <section>
                  <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-[#7C3AED]">info</span>
                    About Company
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                    {user?.bio || "No description provided yet. Add information about your company mission and culture."}
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-[#7C3AED]">work</span>
                    Open Positions
                  </h3>
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 dark:border-white/5">
                    <p className="text-gray-500 italic mb-4">No active job postings at the moment.</p>
                    <button className="text-[#7C3AED] font-black hover:underline flex items-center gap-1 mx-auto">
                      <span className="material-icons-round">add</span>
                      Post a new job
                    </button>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-2xl p-6 space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-gray-400">Details</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="material-icons-round text-[#7C3AED]">location_on</span>
                      <span className="font-bold">{user?.location || 'Not specified'}</span>
                    </div>
                    {user?.role && (
                      <div className="flex items-center gap-3">
                        <span className="material-icons-round text-[#7C3AED]">business</span>
                        <span className="font-bold">Hiring Company</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-2xl p-6 space-y-4">
                  <h4 className="font-black text-sm uppercase tracking-wider text-gray-400">Social Links</h4>
                  <div className="flex gap-3">
                    <button className="w-10 h-10 bg-white dark:bg-[#262626] rounded-xl flex items-center justify-center hover:text-[#7C3AED] transition-colors shadow-sm">
                      <i className="fa-brands fa-linkedin-in"></i>
                    </button>
                    <button className="w-10 h-10 bg-white dark:bg-[#262626] rounded-xl flex items-center justify-center hover:text-[#7C3AED] transition-colors shadow-sm">
                      <i className="fa-solid fa-globe"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerProfile;
