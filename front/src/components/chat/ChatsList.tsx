import React from 'react';
import { AiAssistant } from '../shared/AiAssistant';

// تعريف الـ Interface الخاص بالبيانات عشان يكون جاهز للباك-إند
export interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar?: string;
  initials?: string;
  isOnline?: boolean;
  isGroup?: boolean; // لو جروب بياخد لون برتقالي، لو شات عادي بياخد بنفسجي
}

interface ChatsListProps {
  chats: ChatItem[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

export const ChatsList: React.FC<ChatsListProps> = ({ chats, activeChatId, onSelectChat }) => {
  return (
    <aside className="w-[320px] bg-[#FAFAFA] dark:bg-[#171717] flex flex-col h-full border-r border-gray-200 dark:border-gray-800 transition-colors duration-300 z-40 relative min-h-0 shrink-0">
      
      {/* الهيدر ومربع البحث */}
      <div className="p-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between text-[#171717] dark:text-[#F5F5F5]">
          <span className="text-xl font-bold tracking-tight">Rabta</span>
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400">
            <span className="material-icons">menu</span>
          </button>
        </div>
        <div className="relative group">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">search</span>
          <input
            className="w-full bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-800 rounded-lg py-2 pl-10 pr-4 text-[#171717] dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED]/50 transition-all text-sm focus:outline-none"
            placeholder="Search" type="text"
          />
        </div>
      </div>
      
      {/* رندر المحادثات من الـ Array */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
              activeChatId === chat.id 
                ? 'bg-white dark:bg-[#262626] border-l-4 border-[#7C3AED]' // حالة لو الشات مفتوح
                : 'hover:bg-gray-100 dark:hover:bg-gray-800/50' // حالة لو الشات مش مفتوح
            }`}
          >
            {/* صورة الحساب أو الأحرف */}
            <div className="relative shrink-0">
              {chat.avatar ? (
                <img className="w-12 h-12 rounded-full object-cover" src={chat.avatar} alt={chat.name} />
              ) : (
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${chat.isGroup ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 'bg-[#7C3AED]/10 text-[#7C3AED]'}`}>
                  {chat.initials}
                </div>
              )}
              {/* نقطة الأونلاين الخضراء */}
              {chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#262626] rounded-full"></div>
              )}
            </div>
            
            {/* تفاصيل الرسالة */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-[#171717] dark:text-[#F5F5F5] font-semibold text-sm truncate">{chat.name}</h3>
                <span className={`${activeChatId === chat.id ? 'text-[#7C3AED]' : 'text-gray-400'} text-xs font-medium`}>{chat.time}</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{chat.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Assistant - Positioned at bottom of sidebar */}
      <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-800">
        <AiAssistant 
          className="relative !items-center !justify-center" 
          placeholder="I can help you summarize your messages or find information..." 
        />
      </div>
    </aside>
  );
};