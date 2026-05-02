import React from 'react';
import { useAppSelector } from '../store/hooks';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

const Profile: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [isAiOpen, setIsAiOpen] = useState(false);


  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'github': return 'fa-brands fa-github';
      case 'linkedin': return 'fa-brands fa-linkedin';
      case 'twitter':
      case 'twitter / x': return 'fa-brands fa-x-twitter';
      case 'behance': return 'fa-brands fa-behance';
      case 'portfolio':
      case 'portfolio / website': return 'fa-solid fa-globe';
      default: return 'fa-solid fa-link';
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] font-sans antialiased">
      <main className="max-w-6xl mx-auto p-4 md:p-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* العمود الأيسر (Left Column) */}
          <aside className="w-full lg:w-[35%] space-y-6">
            <div className="bg-white dark:bg-[#262626] rounded-xl shadow-md p-8 text-center border border-gray-100 dark:border-white/5">
              <div className="w-32 h-32 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-4xl font-black shadow-lg mx-auto mb-6 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.fullName || "")
                )}
              </div>
              <h2 className="text-2xl font-bold mb-1">{user?.fullName || 'User Name'}</h2>
              <p className="text-[#7C3AED] dark:text-[#8B5CF6] font-medium mb-4">{user?.jobTitle || 'Front-End Engineer'}</p>
              
              <div className="flex justify-center gap-4 mb-6">
                {user?.links?.map((link: any, index: number) => (
                  <a 
                    key={index} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-[#171717] flex items-center justify-center text-gray-500 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all border border-gray-100 dark:border-white/5"
                    title={link.platform}
                  >
                    <i className={`${getSocialIcon(link.platform)} text-lg`}></i>
                  </a>
                ))}
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate('/edit-profile')}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-icons-round text-sm">edit</span>
                  Edit Profile
                </button>
                
                <button 
                  onClick={() => navigate('/freelancer-dashboard')}
                  className="w-full border-2 border-[#7C3AED] text-[#7C3AED] dark:text-[#8B5CF6] dark:border-[#8B5CF6] hover:bg-[#7C3AED]/5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-icons-round text-sm">dashboard</span>
                  My Dashboard
                </button>
                
                {user && user.role === 'admin' && (
                  <Link 
                    to="/admin"
                    className="w-full border-2 border-[#7C3AED] text-[#7C3AED] dark:text-[#8B5CF6] dark:border-[#8B5CF6] hover:bg-[#7C3AED]/5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-user-shield mr-2"></i>
                    Admin Dashboard
                  </Link>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#262626] rounded-xl shadow-md p-8 border border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-bold mb-4">Technical Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user?.skills?.map((skill: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-[#F3E8FF] dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] rounded-lg text-xs font-bold">
                    {skill}
                  </span>
                )) || <p className="text-xs opacity-50 italic">No skills listed</p>}
              </div>
            </div>
          </aside>

          {/* العمود الأيمن (Right Column) */}
          <div className="w-full lg:w-[65%] flex flex-col gap-8">
            <section className="bg-[#FFFFFF] dark:bg-[#262626] rounded-xl shadow-md p-8 transition-colors duration-300">
              <h3 className="text-2xl font-bold mb-3">About Me</h3>
              <div className="w-12 h-1 bg-[#7C3AED] dark:bg-[#8B5CF6] rounded-full mb-6"></div>
              <p className="leading-relaxed mb-4 text-[#171717] dark:text-[#F5F5F5]">
                {user?.bio || "I am a dedicated Front-End Engineer focused on clean code and user-centric design..."}
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold mb-3 px-2">Featured Projects</h3>
              <div className="w-12 h-1 bg-[#7C3AED] dark:bg-[#8B5CF6] rounded-full mb-6 mx-2"></div>
              
              <div className="grid grid-cols-1 gap-6">
                {user?.projects && user.projects.length > 0 ? (
                  user.projects.map((project: any, index: number) => (
                    <article key={index} className="bg-[#FFFFFF] dark:bg-[#262626] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="grow">
                        <h4 className="text-xl font-bold mb-2">{project.title}</h4>
                        <p className="text-sm opacity-80 mb-4 leading-relaxed">
                          {project.description}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {project.viewLink && (
                            <a href={project.viewLink} target="_blank" rel="noopener noreferrer" className="bg-[#7C3AED] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors">
                              View Project
                            </a>
                          )}
                          {project.githubLink && (
                            <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="border border-[#7C3AED] text-[#7C3AED] px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#7C3AED]/5 transition-colors">
                              GitHub
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-center opacity-50 py-10 italic">No projects added yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* --- AI Floating Button --- */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
        {isAiOpen && (
          <div className="w-80 bg-white dark:bg-[#262626] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#7C3AED] dark:bg-[#8B5CF6] p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="font-bold text-sm">Rabta AI</span>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <span className="material-icons-round text-sm">close</span>
              </button>
            </div>
            <div className="h-48 bg-[#FAFAFA] dark:bg-[#171717] p-4 text-sm text-gray-500 dark:text-[#F5F5F5]/50 italic overflow-y-auto">
              How can I help you today?
            </div>
            <div className="p-4 bg-white dark:bg-[#262626] border-t border-gray-100 dark:border-white/10">
              <input type="text" placeholder="Ask AI anything..." className="w-full text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-[#171717] outline-none" />
            </div>
          </div>
        )}
        <button onClick={() => setIsAiOpen(!isAiOpen)} className="w-12 h-12 bg-[#7C3AED] dark:bg-[#8B5CF6] rounded-full flex items-center justify-center text-white shadow-xl">
          <span className="material-icons-round">bolt</span>
        </button>
      </div>
    </div>
  );
};

export default Profile;