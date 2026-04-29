import { useState, useEffect } from 'react';
import { ChatsList } from '../components/chat/ChatsList';
import type { ChatItem } from '../components/chat/ChatsList';
import { ChatWindow, type MessageType } from '../components/chat/ChatWindow';
import { EmptyChatState } from '../components/chat/EmptyChatState';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { useChat } from '../context/ChatContext';

export const HomeFeed = () => {
  
  // 1. State: تخزين المحادثات والرسائل (دايناميك بالكامل)
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messages] = useState<MessageType[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [, setIsLoadingChats] = useState(true);
  
  // 2. State: التحكم في النوافذ المنبثقة
  const [showNewMessage, setShowNewMessage] = useState(false);
  // Collapsible chat list (Telegram desktop style)
  const [isChatListOpen, setIsChatListOpen] = useState(true);

  // CRITICAL: Always force sidebar open if no chat is selected
  useEffect(() => {
    if (!activeChatId) setIsChatListOpen(true);
  }, [activeChatId]);

  // 3. Effect: جلب قائمة المحادثات من الباك-إند
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoadingChats(true);
        const response = await axiosInstance.get('/chats');
        const me = JSON.parse(localStorage.getItem('user') || '{}');
        const myId = me._id || me.id;
        const formattedChats = response.data.data.chats.map((c: any) => {
          const otherUser = c.users.find((u: any) => (u._id || u.id) !== myId);
          return {
            id: c._id,
            name: c.groupName || otherUser?.fullName || 'Chat',
            lastMessage: c.latestMessage?.content || 'No messages yet',
            time: c.latestMessage?.createdAt ? new Date(c.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            avatar: c.groupName ? undefined : otherUser?.avatar,
            initials: c.groupName ? c.groupName.substring(0, 2).toUpperCase() : otherUser?.fullName?.substring(0, 2).toUpperCase() || 'CH',
            isOnline: false,
            isGroup: c.isGroup,
            isPrivate: c.isPrivate,
            admins: c.admins?.map((a: any) => typeof a === 'string' ? a : a._id),
            groupMembers: c.isGroup ? c.users.map((u: any) => u.fullName) : [],
            otherUserId: c.isGroup ? undefined : otherUser?._id,
            otherUserAvatar: c.isGroup ? undefined : (otherUser?.avatar || ''),
            unreadCount: c.unreadCount || 0,
            lastMessageSender: c.latestMessage?.senderId?.fullName || '',
            lastMessageStatus: c.latestMessage?.status || 'sent',
            isMine: c.latestMessage ? (c.latestMessage.senderId?._id || c.latestMessage.senderId) === myId : false
          };
        });
        // ✅ Safety: strictly exclude any group chats that leak through
        const directChats = formattedChats.filter((c: any) => !c.isGroup);
        setChats(directChats);
      } catch (error) {
        toast.error("Failed to load chats");
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchChats();
  }, []);

  const { socket } = useChat();

  // 4. Effect: Join all chat rooms and listen to incoming messages to update the sidebar dynamically
  useEffect(() => {
    if (!socket || chats.length === 0) return;

    // Join all chat rooms
    chats.forEach(chat => {
      socket.emit('join-room', chat.id);
    });

    const handleReceiveMessage = (message: any) => {
      const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;
      const isMine = (message.senderId?._id || message.senderId) === currentUserId;

      // If we received a message from someone else, emit a delivered ACK
      if (!isMine) {
        socket.emit('message_delivered', { messageId: message._id, chatId: message.chatId });
      }

      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => c.id === message.chatId);
        if (chatIndex > -1) {
          const updatedChats = [...prevChats];
          const isAudio = message.messageType === 'audio' || (message.content && message.content.startsWith('blob:'));
          // Increment unread count if the chat is not currently active
          const isUnread = !isMine && message.chatId !== activeChatId;

          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: isAudio ? 'Voice note' : message.content,
            time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: (updatedChats[chatIndex].unreadCount || 0) + (isUnread ? 1 : 0),
            isMine,
            lastMessageSender: message.senderId?.fullName || '',
            lastMessageStatus: 'sent'
          };
          
          // Move the updated chat to the top of the list
          const [chatToMove] = updatedChats.splice(chatIndex, 1);
          return [chatToMove, ...updatedChats];
        }
        return prevChats;
      });
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket, chats.length]); // Only re-run when socket connects or chat count changes

  // تحديد بيانات الشات المفتوح حالياً لتمريرها كـ Props
  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex w-full h-full bg-[#FAFAFA] dark:bg-[#171717] overflow-hidden relative">
      
      {/* 1. قائمة المحادثات (تستقبل الـ State الدايناميك) */}
      <ChatsList 
        chats={chats} 
        activeChatId={activeChatId} 
        onSelectChat={(id) => {
          setActiveChatId(id);
          // Mark as read when opened
          setChats(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
        }}
        isChatListOpen={isChatListOpen}
        onClose={() => setIsChatListOpen(false)}
      />

      {activeChatId && activeChat ? (
        <ChatWindow 
          chatId={activeChatId}
          chatName={activeChat.name} 
          isOnline={activeChat.isOnline || false} 
          isGroup={activeChat.isGroup || false}
          messages={messages} 
          groupMembers={activeChat.groupMembers}
          isPrivate={activeChat.isPrivate}
          admins={activeChat.admins}
          isChatListOpen={isChatListOpen}
          onOpenChatList={() => setIsChatListOpen(true)}
          otherUserId={(activeChat as any).otherUserId}
          otherUserAvatar={(activeChat as any).otherUserAvatar}
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