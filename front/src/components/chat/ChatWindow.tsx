import React, { useState } from 'react';

export type MessageType = {
  id: string;
  type: 'text' | 'file';
  content?: string;
  fileName?: string;
  fileSize?: string;
  time: string;
  isMine: boolean;
};

interface ChatWindowProps {
  chatName: string;
  isOnline: boolean;
  messages: MessageType[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatName, isOnline, messages }) => {
  const [showUserDetails, setShowUserDetails] = useState(false);

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <main className="flex-1 flex flex-col bg-[#FAFAFA] dark:bg-[#171717] min-h-0 min-w-0 transition-colors duration-300 relative">
        {/* الهيدر بياخد الاسم من الـ Props */}
        <header 
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) setShowUserDetails(!showUserDetails);
          }}
          className="h-16 px-6 bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md flex items-center justify-between border-b border-gray-200 dark:border-gray-800 z-10 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 shrink-0 transition-colors"
        >
          <div className="flex flex-col min-w-0">
            <h2 className="text-[#171717] dark:text-[#F5F5F5] font-bold text-base truncate">{chatName}</h2>
            {isOnline && <span className="text-[#7C3AED] dark:text-[#8B5CF6] text-xs font-medium">Online</span>}
          </div>
          <div className="flex items-center gap-4 text-gray-400 dark:text-gray-500 shrink-0">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button className="px-2.5 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#7C3AED] transition-colors"><span className="material-icons-round text-[20px]">videocam</span></button>
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700"></div>
              <button className="px-1 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#7C3AED] transition-colors"><span className="material-icons-round text-[18px]">arrow_drop_down</span></button>
            </div>
            <button className="hover:text-[#7C3AED] transition-colors"><span className="material-icons-round">search</span></button>
            <button className="hover:text-[#7C3AED] transition-colors"><span className="material-icons-round">more_vert</span></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-4">
          <div className="flex justify-center my-4">
            <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'} w-full`}>
              {msg.type === 'text' ? (
                <div className={`${msg.isMine ? 'bg-[#7C3AED] text-white rounded-tr-none' : 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#F5F5F5] border border-gray-200 dark:border-gray-800 rounded-tl-none'} rounded-xl p-3 shadow-sm max-w-[80%]`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`flex justify-end items-center gap-1 mt-1 ${msg.isMine ? 'text-white/80' : 'text-gray-400'}`}>
                    <span className="text-[10px]">{msg.time}</span>
                    {msg.isMine && <span className="material-icons text-[12px]">done_all</span>}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-800 rounded-xl rounded-tl-none p-2 shadow-sm max-w-[80%]">
                  <div className="rounded-lg overflow-hidden mb-2">
                    <div className="bg-[#FAFAFA] dark:bg-[#171717] p-4 flex items-center gap-3 border border-gray-200 dark:border-gray-800">
                      <div className="w-10 h-10 bg-white dark:bg-[#262626] rounded flex items-center justify-center border border-gray-200 dark:border-gray-800">
                        <span className="material-icons text-[#7C3AED]">description</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#171717] dark:text-[#F5F5F5] text-sm font-medium">{msg.fileName}</span>
                        <span className="text-gray-400 text-[10px]">{msg.fileSize}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[#171717] dark:text-[#F5F5F5] text-sm px-1 mb-1">{msg.content}</p>
                  <span className="block text-right text-[10px] text-gray-400">{msg.time}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <footer className="p-4 bg-white dark:bg-[#262626] border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="max-w-4xl mx-auto flex items-end gap-4">
            <button className="mb-2 text-gray-400 hover:text-[#7C3AED] transition-colors shrink-0"><span className="material-icons">attach_file</span></button>
            <div className="flex-1 bg-[#FAFAFA] dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 py-1.5 focus-within:border-[#7C3AED] transition-colors min-w-0">
              {/* AI Popup (Relatively positioned above the input bar) */}
              {showAiPopup && (
                <div className="absolute bottom-[calc(100%+10px)] left-4 right-4 md:left-auto md:right-auto md:w-80 bg-white dark:bg-[#262626] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col z-[50]">
                  <div className="bg-[#7C3AED] dark:bg-[#8B5CF6] p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="font-bold text-sm">Rabta AI Assistant</span>
                    </div>
                    <button onClick={() => setShowAiPopup(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                      <span className="material-icons-round text-sm">close</span>
                    </button>
                  </div>
                  <div className="h-48 bg-[#FAFAFA] dark:bg-[#171717] p-4 text-sm text-gray-500 italic overflow-y-auto">
                    How can I help you with your conversation with {chatName}?
                  </div>
                  <div className="p-4 bg-white dark:bg-[#262626] border-t border-gray-100 dark:border-gray-800">
                    <input type="text" placeholder="Ask AI..." className="w-full text-sm p-2.5 rounded-xl bg-gray-50 dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] outline-none border border-transparent focus:border-[#7C3AED]" />
                  </div>
                </div>
              )}
              <textarea className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 resize-none text-[#171717] dark:text-[#F5F5F5] placeholder-gray-400 outline-none hide-scrollbar" placeholder="Write a message..." rows={1}></textarea>
              <button className="ml-4 text-gray-400 hover:text-[#7C3AED] transition-colors shrink-0"><span className="material-icons">sentiment_satisfied_alt</span></button>
              <button 
                onClick={() => setShowAiPopup(!showAiPopup)} 
                className={`ml-4 transition-colors shrink-0 ${showAiPopup ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-[#7C3AED]'}`}
              >
                <span className="material-icons-round">bolt</span>
              </button>
              <button className="ml-4 text-gray-400 hover:text-[#7C3AED] transition-colors shrink-0"><span className="material-icons">mic</span></button>
            </div>
            <button className="bg-[#7C3AED] text-white w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 shadow-md shrink-0"><span className="material-icons text-xl">send</span></button>
          </div>
        </footer>
      </main>

      {showUserDetails && (
        <aside className="w-[340px] bg-white dark:bg-[#262626] border-l border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300 relative z-10 shrink-0">
          <div className="p-6 pb-4 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 relative shrink-0">
            <button onClick={() => setShowUserDetails(false)} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors">
              <span className="material-icons">close</span>
            </button>
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCW6ItkwKUr4KlBQ51P-gCFRC6MxWH41ny06iQ2LtV9FoQRsSo-pKrce9CPwQrQiivOzrMecOrLybR1kH-xp40FVxZ9CrusaE6oJZq37YUIoDFgUGIrlyA0DeQWOCUXHyWkiWDT2Iag-9WcyTkL6__d64juO7NigKCiN0n8UoJoEqC-dd7-IUigCxsfMGAI7emL13gJeCGVk28QzFR6sRIEQbzgmWk77vTh06zwkU5KBZf8sA5y4L8czqcwPE1-fCMGC-X5VQ6kfTMV" className="w-24 h-24 rounded-full object-cover mb-3 shadow-sm" alt="User" />
            <h3 className="font-bold text-lg text-[#171717] dark:text-[#F5F5F5]">{chatName}</h3>
            <p className="text-xs text-gray-500 mt-1">Senior Front-End Developer</p>
          </div>
        </aside>
      )}
    </div>
  );
};