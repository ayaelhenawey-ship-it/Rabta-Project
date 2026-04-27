import { useState, useEffect } from 'react';
import { ChatsList } from '../components/chat/ChatsList';
import type { ChatItem } from '../components/chat/ChatsList';
import { ChatWindow, type MessageType } from '../components/chat/ChatWindow';
import { EmptyChatState } from '../components/chat/EmptyChatState';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';

export const HomeFeed = () => {
  
  // 1. State: تخزين المحادثات والرسائل (دايناميك بالكامل)
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [, setIsLoadingChats] = useState(true);
  
  // 2. State: التحكم في النوافذ المنبثقة
  const [showNewMessage, setShowNewMessage] = useState(false);

  // 3. Effect: جلب قائمة المحادثات من الباك-إند
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoadingChats(true);
        const response = await axiosInstance.get('/chats');
        setChats(response.data.data.chats);
      } catch (error) {
        toast.error("Failed to load chats");
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchChats();
  }, []);

  // 4. Effect: جلب الرسائل لما اليوزر يختار شات معين
  useEffect(() => {
    if (activeChatId) {
      const fetchMessages = async () => {
        try {
          const response = await axiosInstance.get(`/chats/${activeChatId}/messages`);
          // تحويل شكل الرسائل من الباك لشكل الفرونت
          const formatted = response.data.data.messages.map((m: any) => ({
            id: m._id,
            type: m.messageType === 'file' ? 'file' : 'text',
            content: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMine: m.senderId._id === JSON.parse(localStorage.getItem('user') || '{}')._id || m.senderId === JSON.parse(localStorage.getItem('user') || '{}')._id
          }));
          setMessages(formatted);
        } catch (error) {
          toast.error("Failed to load messages");
        }
      };
      fetchMessages();
    }
  }, [activeChatId]);

  // تحديد بيانات الشات المفتوح حالياً لتمريرها كـ Props
  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex w-full h-full bg-[#FAFAFA] dark:bg-[#171717] overflow-hidden relative">
      
      {/* 1. قائمة المحادثات (تستقبل الـ State الدايناميك) */}
      <ChatsList 
        chats={chats} 
        activeChatId={activeChatId} 
        onSelectChat={setActiveChatId} 
      />

      {/* 2. مساحة المحتوى: لو فيه شات اختاره افتحه، غير كده هات الشاشة الفاضية */}
      {activeChatId && activeChat ? (
        <ChatWindow 
          chatName={activeChat.name} 
          isOnline={activeChat.isOnline || false} 
          messages={messages} 
        />
      ) : (
        <EmptyChatState onNewMessage={() => setShowNewMessage(true)} />
      )}

      {/* 3. نافذة رسالة جديدة (New Message Modal) */}
      {showNewMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewMessage(false)}></div>
          <div className="bg-white dark:bg-[#262626] w-full max-w-md rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden">
             <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg text-[#171717] dark:text-[#F5F5F5]">New Message</h3>
                <button onClick={() => setShowNewMessage(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <span className="material-icons-round">close</span>
                </button>
             </div>
             <div className="p-4">
               {/* Search Input */}
               <div className="relative mb-4">
                  <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                  <input type="text" placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2.5 bg-[#FAFAFA] dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none text-[#171717] dark:text-[#F5F5F5]" />
               </div>
               {/* Contacts List (ستأتي أيضاً من الباك-إند) */}
               <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                 Suggested contacts will appear here...
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};