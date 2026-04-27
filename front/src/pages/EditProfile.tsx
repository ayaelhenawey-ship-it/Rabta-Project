import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateProfile } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { uploadProfilePicture } from '../api/auth';
import toast from 'react-hot-toast';
import { Popup } from '../components/ui/Popup'; 

interface Link {
  id: number;
  platform: string;
  url: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  viewLink: string;
  githubLink: string;
}

interface FormDataType {
  fullName: string;
  jobTitle: string;
  location: string;
  bioHeadline: string;
  detailedAbout: string;
  contactEmail: string;
  skills: string[];
  links: Link[];
  projects: Project[];
}

const EditProfile: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // حالة البوب أب
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({
    fullName: user?.fullName || '',
    jobTitle: user?.jobTitle || '',
    location: user?.location || '',
    bioHeadline: user?.bioHeadline || '',
    detailedAbout: user?.bio || '',
    contactEmail: user?.contactEmail || '',
    skills: Array.isArray(user?.skills) ? user.skills : [],
    links: user?.links || [{ id: 1, platform: '', url: '' }],
    projects: user?.projects || [{ id: 2, title: '', description: '', viewLink: '', githubLink: '' }]
  });

  const addLink = () => {
    setFormData({
      ...formData,
      links: [...formData.links, { id: Date.now(), platform: '', url: '' }]
    });
  };

  const removeLink = (id: number) => {
    setFormData({ ...formData, links: formData.links.filter((l: Link) => l.id !== id) });
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { id: Date.now() + 1, title: '', description: '', viewLink: '', githubLink: '' }]
    });
  };

  const removeProject = (id: number) => {
    setFormData({ ...formData, projects: formData.projects.filter((p: Project) => p.id !== id) });
  };

  const handleLinkChange = (id: number, field: string, value: string) => {
    setFormData({
      ...formData,
      links: formData.links.map((l: Link) => l.id === id ? { ...l, [field]: value } : l)
    });
  };

  const handleProjectChange = (id: number, field: string, value: string) => {
    setFormData({
      ...formData,
      projects: formData.projects.map((p: Project) => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let loadingToast: string | undefined;
    try {
      setIsUploading(true);
      loadingToast = toast.loading("Uploading image...");
      const response = await uploadProfilePicture(file);
      
      // تحديث الداتا في الـ Redux والـ localStorage
      dispatch(updateProfile({ avatar: response.avatar }));
      
      toast.success("Profile photo updated!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to upload image. Please try again.", { id: loadingToast });
      console.error("Upload Error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    if (window.confirm("Are you sure you want to remove your profile photo?")) {
      dispatch(updateProfile({ avatar: null }));
      toast.success("Profile photo removed.");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(updateProfile(formData));
    setShowSuccessPopup(true); // إظهار النجاح بدل الانتقال الفوري
  };

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] font-sans antialiased overflow-hidden transition-colors duration-300">

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 text-[#7C3AED]">Edit Your Profile</h1>
            <p className="opacity-80 italic">Update your professional information and portfolio</p>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#262626] rounded-xl shadow-lg p-8 border border-gray-100 dark:border-white/5 transition-colors duration-300">
            <form onSubmit={handleSubmit} className="flex flex-col gap-10">
              
              {/* 1. Basic Information */}
              <div>
                <h3 className="text-xl font-bold mb-4 border-b border-[#171717]/10 dark:border-[#F5F5F5]/10 pb-2">1. Basic Information</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-linear-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden border-4 border-white dark:border-[#262626]">
                      {user?.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        getInitials(formData.fullName || user?.fullName || "")
                      )}
                    </div>
                    {user?.avatar && (
                      <button 
                        type="button"
                        onClick={handleDeletePhoto}
                        className="absolute -top-1 -right-1 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        title="Delete Photo"
                      >
                        <span className="material-icons-round text-sm">delete</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Current Profile Photo</h4>
                    <p className="text-sm opacity-70 mb-3">Square image recommended. Max 2MB.</p>
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                    />
                    <button 
                      type="button" 
                      disabled={isUploading}
                      className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md inline-block disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <label 
                        htmlFor="avatar-upload" 
                        className={isUploading ? "cursor-not-allowed" : "cursor-pointer"}
                      >
                        {isUploading ? "Uploading..." : "Change Photo"}
                      </label>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Full Name</label>
                    <input type="text" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Job Title</label>
                    <input type="text" value={formData.jobTitle} onChange={(e) => handleInputChange('jobTitle', e.target.value)} className="input-field" />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Short Bio (Headline)</label>
                  <textarea rows={2} value={formData.bioHeadline} onChange={(e) => handleInputChange('bioHeadline', e.target.value)} className="input-field resize-none" />
                </div>
              </div>

              {/* 2. Social Links & Contact */}
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-[#171717]/10 dark:border-[#F5F5F5]/10 pb-2 text-[#7C3AED]">
                  <h3 className="text-xl font-bold">2. Social Links & Contact</h3>
                  <button type="button" onClick={addLink} className="text-sm font-bold hover:underline">+ Add Link</button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Contact Email</label>
                  <input type="email" value={formData.contactEmail} onChange={(e) => handleInputChange('contactEmail', e.target.value)} className="input-field" placeholder="your.email@example.com" />
                </div>

                <div className="flex flex-col gap-4">
                  {formData.links.map((link: Link) => (
                    <div key={link.id} className="flex flex-col sm:flex-row items-end gap-4 animate-in fade-in duration-300">
                      <div className="w-full sm:w-1/3">
                        <label className="block text-xs font-bold uppercase mb-1 opacity-50">Platform</label>
                        <select value={link.platform} onChange={(e) => handleLinkChange(link.id, 'platform', e.target.value)} className="input-field appearance-none bg-white dark:bg-[#171717]">
                          <option value="">Select Platform</option>
                          <option value="GitHub">GitHub</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Portfolio">Portfolio / Website</option>
                          <option value="Twitter">Twitter / X</option>
                          <option value="Behance">Behance</option>
                        </select>
                      </div>
                      <div className="grow w-full">
                        <label className="block text-xs font-bold uppercase mb-1 opacity-50">URL</label>
                        <input type="url" value={link.url} onChange={(e) => handleLinkChange(link.id, 'url', e.target.value)} className="input-field" placeholder="https://..." />
                      </div>
                      <button type="button" onClick={() => removeLink(link.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <span className="material-icons-round">delete_outline</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Technical Skills */}
              <div>
                <h3 className="text-xl font-bold mb-4 border-b border-[#171717]/10 dark:border-[#F5F5F5]/10 pb-2">3. Professional Details</h3>
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">About Me (Detailed)</label>
                  <textarea rows={5} value={formData.detailedAbout} onChange={(e) => handleInputChange('detailedAbout', e.target.value)} className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Skills (Press Enter to add)</label>
                  <div className="input-field flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-[#7C3AED]/20">
                    {formData.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="bg-[#7C3AED] text-white px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                        {skill}
                        <button type="button" onClick={() => setFormData({ ...formData, skills: formData.skills.filter((_: string, i: number) => i !== idx) })} className="hover:opacity-70">×</button>
                      </span>
                    ))}
                    <input type="text" placeholder="Add skill..." onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        e.preventDefault();
                        const skill = (e.target as HTMLInputElement).value.trim();
                        setFormData({ ...formData, skills: [...formData.skills, skill] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }} className="bg-transparent border-none outline-none grow min-w-48" />
                  </div>
                </div>
              </div>

              {/* 4. Projects */}
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-[#171717]/10 dark:border-[#F5F5F5]/10 pb-2 text-[#7C3AED]">
                  <h3 className="text-xl font-bold">4. Featured Projects</h3>
                  <button type="button" onClick={addProject} className="text-sm font-bold hover:underline">+ Add Project</button>
                </div>
                {formData.projects.map((project: Project) => (
                  <div key={project.id} className="bg-gray-50/50 dark:bg-[#171717]/50 border border-gray-200 dark:border-white/5 rounded-2xl p-6 relative group mb-6">
                    <button type="button" onClick={() => removeProject(project.id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition-colors">
                      <span className="material-icons-round">delete_outline</span>
                    </button>
                      <div className="grid grid-cols-1 gap-4">
                        <label className="block text-sm font-bold opacity-70">Project Title</label>
                        <input type="text" value={project.title} onChange={(e) => handleProjectChange(project.id, 'title', e.target.value)} className="input-field bg-white dark:bg-[#262626]" placeholder="e.g. My Awesome App" />
                        
                        <label className="block text-sm font-bold opacity-70">Project Description</label>
                        <textarea rows={3} value={project.description} onChange={(e) => handleProjectChange(project.id, 'description', e.target.value)} className="input-field bg-white dark:bg-[#262626] resize-none" placeholder="Briefly describe what this project is..." />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold opacity-70 mb-1">View Project Link (Optional)</label>
                            <input type="url" value={project.viewLink} onChange={(e) => handleProjectChange(project.id, 'viewLink', e.target.value)} className="input-field bg-white dark:bg-[#262626]" placeholder="https://..." />
                          </div>
                          <div>
                            <label className="block text-sm font-bold opacity-70 mb-1">GitHub Repo Link (Optional)</label>
                            <input type="url" value={project.githubLink} onChange={(e) => handleProjectChange(project.id, 'githubLink', e.target.value)} className="input-field bg-white dark:bg-[#262626]" placeholder="https://github.com/..." />
                          </div>
                        </div>
                      </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-4 flex justify-end gap-4 border-t dark:border-white/10 pt-8">
                <button type="button" onClick={() => navigate('/profile')} className="px-10 py-3 rounded-xl font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-100 transition-all">Cancel</button>
                <button type="submit" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-[#7C3AED]/20 transition-all active:scale-95">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* AI & Popup */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50">
        {isAiOpen && (
          <div className="w-80 bg-white dark:bg-[#262626] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#7C3AED] p-4 text-white flex justify-between items-center font-bold text-sm">
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><span>Rabta AI</span></div>
              <button onClick={() => setIsAiOpen(false)}><span className="material-icons-round">close</span></button>
            </div>
            <div className="h-40 p-4 text-sm italic opacity-60">I can suggest improvements to your profile content!</div>
            <div className="p-4 border-t"><input type="text" className="w-full text-sm p-2.5 rounded-xl border border-gray-300 outline-none focus:border-[#7C3AED]" placeholder="Ask AI..." /></div>
          </div>
        )}
        <button onClick={() => setIsAiOpen(!isAiOpen)} className="w-12 h-12 bg-[#7C3AED] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform"><span className="material-icons-round text-2xl">bolt</span></button>
      </div>

      {showSuccessPopup && (
        <Popup onClose={() => navigate('/profile')}>
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-round text-3xl">check</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-[#7C3AED]">Profile Updated!</h2>
            <p className="opacity-60 mb-6">Your changes have been saved successfully. Your professional brand is looking great.</p>
            <button onClick={() => navigate('/profile')} className="w-full bg-[#7C3AED] text-white py-3 rounded-xl font-bold shadow-lg">Back to Profile</button>
          </div>
        </Popup>
      )}

      <style>{`
        .nav-icon-btn { @apply w-12 h-12 flex items-center justify-center text-gray-400 hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] hover:bg-[#7C3AED]/10 dark:hover:bg-[#8B5CF6]/10 rounded-2xl transition-all duration-300; }
        .input-field { @apply w-full bg-gray-50/50 dark:bg-[#171717] border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all placeholder-gray-400 text-sm; }
      `}</style>
    </div>
  );
};

export default EditProfile;
