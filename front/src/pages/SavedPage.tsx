// src/pages/SavedContent.tsx
import React, { useState } from 'react';

export const SavedContent = () => {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <span className="material-icons-round text-[#7C3AED]">bookmark</span>
          Saved Items
        </h1>
        <p className="opacity-60 text-sm italic">Posts and jobs you've bookmarked for later.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b dark:border-white/5">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'posts' ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]' : 'opacity-40 hover:opacity-100'}`}
        >
          Saved Posts
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'jobs' ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]' : 'opacity-40 hover:opacity-100'}`}
        >
          Saved Jobs
        </button>
      </div>

      {/* Content Placeholder */}
      <div className="grid grid-cols-1 gap-6">
        {/* دي مساحة فاضية "Empty State" لو مفيش حاجات محفوظة */}
        <div className="bg-white dark:bg-[#262626] rounded-3xl p-12 text-center border border-dashed border-gray-200 dark:border-white/10">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-icons-round text-3xl opacity-20">bookmark_border</span>
          </div>
          <h3 className="font-bold mb-1 text-lg">No saved {activeTab} yet</h3>
          <p className="text-sm opacity-50 max-w-xs mx-auto">Items you bookmark will appear here so you can easily find them later.</p>
        </div>
      </div>
    </div>
  );
};
