import React, { useState } from 'react';
import { AiAssistant } from '../shared/AiAssistant';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

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
  isPrivate?: boolean;
  admins?: string[];
  groupMembers?: string[];
  unreadCount?: number;
  lastMessageSender?: string;
  lastMessageStatus?: 'sent' | 'delivered' | 'read' | 'sending';
  isMine?: boolean;
}

interface ChatsListProps {
  chats: ChatItem[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  isChatListOpen?: boolean;
  onClose?: () => void;
}

export const ChatsList: React.FC<ChatsListProps> = ({ chats, activeChatId, onSelectChat, isChatListOpen = true, onClose }) => {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) return;

    setIsSearching(true);
    try {
      const res = await axiosInstance.get(`/users/find-by-phone?phone=${phoneSearch}`);
      setFoundUser(res.data.data.user);
      if (!res.data.data.user) {
        toast.error("No user found with this number");
      }
    } catch (err) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddConnection = async (userId: string) => {
    try {
      await axiosInstance.post('/users/add-connection', { userId });
      toast.success("Added to connections!");
      setFoundUser(null);
      setPhoneSearch('');
    } catch (err) {
      toast.error("Failed to add connection");
    }
  };
  return (
    <aside className={`flex flex-col h-full bg-[#FAFAFA] dark:bg-[#171717] transition-all duration-300 ease-in-out z-40 relative min-h-0 shrink-0 ${
      isChatListOpen
        ? 'w-80 md:w-96 opacity-100 border-r border-gray-200 dark:border-gray-800'
        : 'w-0 opacity-0 overflow-hidden border-none px-0 mx-0'
    }`}>
      
      {/* الهيدر ومربع البحث */}
      <div className="p-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between text-[#171717] dark:text-[#F5F5F5]">
          <span className="text-xl font-bold tracking-tight">Rabta</span>
          {/* Only show collapse button when a chat is active */}
          {!!activeChatId && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
              title="Collapse chat list"
            >
              <span className="material-icons">menu</span>
            </button>
          )}
        </div>
        <form onSubmit={handlePhoneSearch} className="relative group">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">phone</span>
          <input
            className="w-full bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-800 rounded-lg py-2 pl-10 pr-4 text-[#171717] dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#7C3AED]/50 transition-all text-sm focus:outline-none"
            placeholder="Find user by phone number" 
            type="text"
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </form>

        {/* Found User Mini-Card */}
        {foundUser && (
          <div className="bg-white dark:bg-[#262626] border border-[#7C3AED]/30 rounded-xl p-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center font-bold">
                {foundUser.avatar ? (
                  <img src={foundUser.avatar} className="w-full h-full rounded-full object-cover" />
                ) : foundUser.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] truncate">{foundUser.fullName}</h4>
                <p className="text-xs text-gray-500 truncate">{foundUser.jobTitle || foundUser.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  // In a real app, we'd start a chat or add to connections
                  if (foundUser.role === 'freelancer') {
                    handleAddConnection(foundUser._id);
                  } else {
                    toast.success("Starting chat...");
                    setFoundUser(null);
                    setPhoneSearch('');
                  }
                }}
                className="flex-1 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-lg transition-colors"
              >
                {foundUser.role === 'freelancer' ? 'Add Connection' : 'Contact'}
              </button>
              <button 
                onClick={() => setFoundUser(null)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-xs hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`text-sm truncate ${chat.unreadCount ? 'font-bold text-[#171717] dark:text-[#F5F5F5]' : 'font-semibold text-[#171717] dark:text-[#F5F5F5]'}`}>
                  {chat.name}
                </h3>
                <span className={`${chat.unreadCount ? 'text-[#10B981] font-bold' : activeChatId === chat.id ? 'text-[#7C3AED]' : 'text-gray-400'} text-xs`}>
                  {chat.time}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-1 text-xs truncate ${chat.unreadCount ? 'font-bold text-[#171717] dark:text-[#F5F5F5]' : 'text-gray-500 dark:text-gray-400'}`}>
                  {chat.isMine && (
                    <span className={`material-icons text-[14px] shrink-0 ${chat.lastMessageStatus === 'read' ? 'text-blue-400' : 'text-gray-400'}`}>
                      {chat.lastMessageStatus === 'sending' ? 'schedule' : chat.lastMessageStatus === 'sent' ? 'check' : 'done_all'}
                    </span>
                  )}
                  <p className="truncate">
                    {chat.isGroup && !chat.isMine && chat.lastMessageSender ? `${chat.lastMessageSender.split(' ')[0]}: ` : ''}
                    {chat.lastMessage}
                  </p>
                </div>
                {!!chat.unreadCount && (
                  <div className="w-5 h-5 bg-[#10B981] text-white text-[10px] font-bold flex items-center justify-center rounded-full shrink-0">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
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