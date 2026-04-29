import React, { useState, useRef } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';

export type MessageType = {
  id: string;
  type: 'text' | 'file' | 'audio' | 'call_summary';
  content?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  time: string;
  isMine: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
};

interface ChatWindowProps {
  chatId?: string;
  chatName: string;
  isOnline: boolean;
  isGroup?: boolean;
  messages: MessageType[];
  groupMembers?: string[];
  isPrivate?: boolean;
  admins?: string[];
  isChatListOpen?: boolean;
  onOpenChatList?: () => void;
  otherUserId?: string;
  otherUserAvatar?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, chatName, isOnline, isGroup = false, messages = [], groupMembers = [], isPrivate = false, admins = [], isChatListOpen = true, onOpenChatList, otherUserId, otherUserAvatar }) => {
  const { socket } = useChat();
  const { callUser, callGroup } = useCall();
  const [localMessages, setLocalMessages] = useState<MessageType[]>(messages || []);

  if (!chatId || !chatName) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FAFAFA] dark:bg-[#171717] h-full text-gray-500">
        Select a chat to start messaging
      </div>
    );
  }

  // Sync props with local state and fetch history from backend
  React.useEffect(() => {
    if (!chatId) {
      setLocalMessages(messages);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await axiosInstance.get(`/chats/${chatId}/messages`);
        const formatted = res.data.data.messages.map((m: any) => {
          const isAudio = m.messageType === 'audio' || (m.content && m.content.startsWith('blob:'));
          const fileAttachment = m.attachments?.[0];
          return {
            id: m._id,
            content: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMine: (m.senderId?._id || m.senderId) === JSON.parse(localStorage.getItem('user') || '{}')._id,
            type: isAudio ? 'audio' : (m.messageType || 'text'),
            fileUrl: isAudio ? m.content : (fileAttachment?.fileUrl || undefined),
            fileName: fileAttachment ? (fileAttachment.fileUrl.split('/').pop() || 'Document') : undefined,
            fileSize: fileAttachment && fileAttachment.fileSize ? `${(fileAttachment.fileSize / 1024 / 1024).toFixed(2)} MB` : undefined,
            status: m.status || 'sent'
          };
        });
        setLocalMessages(formatted); // ✅ Backend is already ascending, do NOT reverse
      } catch (err) {
        setLocalMessages(messages);
      }
    };
    
    fetchMessages();

    // Mark messages as read when opening the chat
    axiosInstance.put(`/chats/${chatId}/read`).catch(console.error);

  }, [chatId]); // Fetch whenever the chat changes

  // Listen to live socket messages for this specific chat
  React.useEffect(() => {
    if (!socket || !chatId) return;

    const handleReceiveMessage = (message: any) => {
      // Only process messages that belong to the active ChatWindow
      if (message.chatId === chatId) {
        const isAudio = message.messageType === 'audio' || (message.content && message.content.startsWith('blob:'));
        const fileAttachment = message.attachments?.[0];
        const newMsg: MessageType = {
          id: message._id,
          content: message.content,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMine: (message.senderId?._id || message.senderId) === JSON.parse(localStorage.getItem('user') || '{}')._id,
          type: isAudio ? 'audio' : (message.messageType || 'text'),
          fileUrl: isAudio ? message.content : (fileAttachment?.fileUrl || undefined),
          fileName: fileAttachment ? (fileAttachment.fileUrl.split('/').pop() || 'Document') : undefined,
          fileSize: fileAttachment && fileAttachment.fileSize ? `${(fileAttachment.fileSize / 1024 / 1024).toFixed(2)} MB` : undefined,
          status: message.status || 'sent'
        };

        if (!newMsg.isMine) {
          // If we receive a message in the active chat window, it's instantly read
          socket.emit('message_read', { messageId: newMsg.id, chatId });
          newMsg.status = 'read';
        }
        
        setLocalMessages(prev => {
          // Prevent appending duplicates if handleSendMessage already pushed it locally
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    socket.on('receive-message', handleReceiveMessage);
    
    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket, chatId]);

  // Listen to message-status-update socket event for real-time ACKs
  React.useEffect(() => {
    if (!socket || !chatId) return;

    const handleStatusUpdate = (data: { messageId?: string, chatId: string, readBy?: string, status?: 'delivered' | 'read' }) => {
      if (data.chatId === chatId) {
        setLocalMessages(prev => prev.map(msg => {
          // If a specific messageId is provided, update that one
          if (data.messageId && msg.id === data.messageId && msg.isMine) {
            return { ...msg, status: data.status || 'read' };
          }
          // If it's a general bulk read (like when opening a chat), update all unread mine
          if (!data.messageId && msg.isMine && msg.status !== 'read') {
            return { ...msg, status: 'read' };
          }
          return msg;
        }));
      }
    };

    socket.on('message-status-update', handleStatusUpdate);
    socket.on('messages-read', handleStatusUpdate); // Legacy bulk read event
    
    return () => {
      socket.off('message-status-update', handleStatusUpdate);
      socket.off('messages-read', handleStatusUpdate);
    };
  }, [socket, chatId]);
  
  // Menus State
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Task 1 States
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'search' | 'details' | null>(null);
  const [activeTab, setActiveTab] = useState<'Members' | 'Media' | 'Posts'>('Members');
  const [showGroupPostModal, setShowGroupPostModal] = useState(false);
  
  // Task 2: Functional Logic Modals
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleToggleBlock = async () => {
    try {
      // Optimistic UI update
      const newBlockedState = !isBlocked;
      setIsBlocked(newBlockedState);
      setShowOptionsMenu(false);
      await axiosInstance.put(`/users/block/${chatId}`);
      toast.success(newBlockedState ? 'User blocked.' : 'User unblocked.');
    } catch (err) {
      setIsBlocked(prev => !prev); // revert on failure
      toast.error('Failed to update block status.');
    }
  };

  // Task 2: Live Search for Add Member
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;
  const isAdmin = admins.includes(currentUserId);
  const canAddMembers = !isPrivate || isAdmin;

  // Live Search Effect (Debounced)
  React.useEffect(() => {
    if (!showAddMemberModal || userSearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await axiosInstance.get(`/users/search/all?query=${userSearchQuery}`);
        // Filter out users who are already in the group (if we had IDs, but we only have names in groupMembers prop right now)
        // For now, just show all found users
        setSearchResults(res.data.data.users);
      } catch (err) {
        console.error("User search failed:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userSearchQuery, showAddMemberModal]);

  const handleAddUserToGroup = async (targetUserId: string) => {
    try {
      await axiosInstance.put('/chats/group/add', { chatId, userId: targetUserId });
      toast.success("User added to group!");
      // Optionally refresh members list here if needed
      setSearchResults(prev => prev.filter(u => u._id !== targetUserId));
    } catch (err) {
      toast.error("Failed to add user");
    }
  };

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handlers for Emoji and Audio
  const onEmojiClick = (emojiObject: any) => {
    setMessageText(prev => prev + emojiObject.emoji);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRecordingTime(0);
      audioChunksRef.current = [];
    }
  };

  const togglePauseResume = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        // Resume timer
        timerIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        // Pause timer
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice-note.webm');

        try {
          // Send to backend directly
          await axiosInstance.post(`/chats/${chatId}/audio`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success("Voice note sent");
        } catch (err) {
          console.error("Audio upload failed:", err);
          toast.error("Failed to send voice note");
        }
      };
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const content = messageText;
    setMessageText(""); // Clear immediately for snappy UX

    try {
      // Send to backend directly
      await axiosInstance.post(`/chats/${chatId}/send`, { 
        content, 
        type: 'text' 
      });
      // The socket 'receive-message' will append it to the chat
    } catch (err) {
      console.error("Text message failed:", err);
      toast.error("Failed to send message");
      setMessageText(content); // Restore text on failure
    }
  };

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <main className="flex-1 flex flex-col bg-[#FAFAFA] dark:bg-[#171717] min-h-0 min-w-0 transition-colors duration-300 relative">
        {/* الهيدر بياخد الاسم من الـ Props */}
        <header 
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) setActiveSidePanel('details');
          }}
          className="h-16 px-4 bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md flex items-center justify-between border-b border-gray-200 dark:border-gray-800 z-10 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 shrink-0 transition-colors"
        >
          <div className="flex items-center min-w-0 gap-2">
            {/* Reopen chat list button — only shown when list is collapsed */}
            {!isChatListOpen && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenChatList?.(); }}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shrink-0"
                title="Open chat list"
              >
                <span className="material-icons text-[22px]">menu</span>
              </button>
            )}
          <div className="flex flex-col min-w-0">
            <h2 className="text-[#171717] dark:text-[#F5F5F5] font-bold text-base truncate">{chatName || 'Unknown Chat'}</h2>
            {isGroup ? (
              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {groupMembers && groupMembers?.filter(Boolean)?.length > 0 
                  ? (groupMembers?.filter(Boolean)?.length <= 2 
                      ? groupMembers?.filter(Boolean)?.join(", ") 
                      : `${groupMembers?.filter(Boolean)?.slice(0, 2).join(", ")}, +${groupMembers?.filter(Boolean)?.length - 2} others`)
                  : "Group members"}
              </span>
            ) : (
              isOnline && <span className="text-[#7C3AED] dark:text-[#8B5CF6] text-xs font-medium">Online</span>
            )}
          </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400 dark:text-gray-500 shrink-0 relative">
            
            {/* Task 3: Call Menu */}
            <div className="relative">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    console.log("Call Target Extracted:", { otherUserId, chatName, isGroup });
                    if (isGroup) {
                      callGroup(chatId!, chatName, 'video');
                    } else if (otherUserId) {
                      callUser(otherUserId, chatName, 'video', otherUserAvatar, chatId);
                    } else {
                      toast.error('Cannot start call: user info unavailable');
                    }
                  }}
                  className="px-2.5 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#7C3AED] transition-colors"
                  title="Video Call"
                >
                  <span className="material-icons-round text-[20px]">videocam</span>
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700"></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowCallMenu(!showCallMenu); setShowOptionsMenu(false); }}
                  className="px-1 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#7C3AED] transition-colors"
                >
                  <span className="material-icons-round text-[18px]">arrow_drop_down</span>
                </button>
              </div>
              
              {showCallMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#262626] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                  <button onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowCallMenu(false); 
                    console.log("Call Target Extracted:", { otherUserId, chatName, isGroup });
                    if (isGroup) return callGroup(chatId!, chatName, 'video');
                    otherUserId ? callUser(otherUserId, chatName, 'video', otherUserAvatar, chatId) : toast.error('User info unavailable'); 
                  }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                    <span className="material-icons-round text-[#7C3AED] text-[18px]">videocam</span> Video Call
                  </button>
                  <button onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowCallMenu(false); 
                    console.log("Call Target Extracted:", { otherUserId, chatName, isGroup });
                    if (isGroup) return callGroup(chatId!, chatName, 'voice');
                    otherUserId ? callUser(otherUserId, chatName, 'voice', otherUserAvatar, chatId) : toast.error('User info unavailable'); 
                  }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                    <span className="material-icons-round text-[#7C3AED] text-[18px]">call</span> Voice Call
                  </button>
                </div>
              )}
            </div>

            {/* Task 4: Dynamic Options Menu */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); setShowCallMenu(false); }}
                className="hover:text-[#7C3AED] transition-colors"
              >
                <span className="material-icons-round">more_vert</span>
              </button>
              
              {showOptionsMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#262626] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                  {isGroup ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setActiveSidePanel('details'); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">info</span> Group Details
                      </button>
                      <hr className="my-1 border-gray-100 dark:border-gray-800" />
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          try {
                            await axiosInstance.delete(`/chats/${chatId}/clear`);
                            setLocalMessages([]);
                            toast.success("Chat cleared");
                            setShowOptionsMenu(false);
                          } catch (err) {
                            toast.error("Failed to clear chat");
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-red-500"
                      >
                        <span className="material-icons-round text-[18px]">delete_sweep</span> Clear Chat
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setActiveSidePanel('details'); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">account_circle</span> View Contact
                      </button>
                      <hr className="my-1 border-gray-100 dark:border-gray-800" />
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          try {
                            await axiosInstance.delete(`/chats/${chatId}/clear`);
                            setLocalMessages([]);
                            toast.success("Chat cleared");
                            setShowOptionsMenu(false);
                          } catch (err) {
                            toast.error("Failed to clear chat");
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-red-500"
                      >
                        <span className="material-icons-round text-[18px]">delete_sweep</span> Clear Chat
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleBlock(); }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-red-500"
                      >
                        <span className="material-icons-round text-[18px]">{isBlocked ? 'check_circle' : 'block'}</span>
                        {isBlocked ? 'Unblock User' : 'Block User'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-4">
          <div className="flex justify-center my-4">
            <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
          </div>

          {(localMessages || []).map((msg) => (
            <div key={msg?.id || Math.random().toString()} className={`flex flex-col ${msg?.isMine ? 'items-end' : 'items-start'} w-full`}>
              {msg?.type === 'call_summary' ? (
                <div className="flex justify-center w-full my-2">
                  <div className="bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-full text-[13px] flex items-center gap-2 shadow-sm transition-transform hover:scale-105">
                    <span className="material-icons-round text-lg text-[#7C3AED] dark:text-[#8B5CF6]">
                      {msg?.content?.includes('Video') ? 'videocam' : 'call'}
                    </span>
                    <span className="font-medium">{msg?.content}</span>
                  </div>
                </div>
              ) : msg?.type === 'text' ? (
                <div className={`${msg?.isMine ? 'bg-[#7C3AED] text-white rounded-tr-none' : 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#F5F5F5] border border-gray-200 dark:border-gray-800 rounded-tl-none'} rounded-xl p-3 shadow-sm max-w-[80%]`}>
                  <p className="text-sm leading-relaxed">{msg?.content}</p>
                  <div className={`flex justify-end items-center gap-1 mt-1 ${msg?.isMine ? 'text-white/80' : 'text-gray-400'}`}>
                    <span className="text-[10px]">{msg?.time}</span>
                    {msg?.isMine && (
                      <span className={`material-icons text-[14px] ${msg?.status === 'read' ? 'text-blue-300' : msg?.status === 'sending' ? 'text-gray-400 opacity-50' : ''}`}>
                        {msg?.status === 'sending' ? 'schedule' : msg?.status === 'sent' ? 'check' : 'done_all'}
                      </span>
                    )}
                  </div>
                </div>
              ) : msg?.type === 'audio' ? (
                <div className={`${msg?.isMine ? 'bg-[#7C3AED] text-white rounded-tr-none' : 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#F5F5F5] border border-gray-200 dark:border-gray-800 rounded-tl-none'} rounded-xl p-3 shadow-sm max-w-[80%] flex items-center gap-3`}>
                  <audio controls src={msg?.fileUrl || msg?.content} className="h-10 w-48 custom-audio-player" />
                  <div className={`flex flex-col justify-end items-end gap-1 mt-1 ${msg?.isMine ? 'text-white/80' : 'text-gray-400'}`}>
                    <span className="text-[10px]">{msg?.time}</span>
                    {msg?.isMine && (
                      <span className={`material-icons text-[14px] ${msg?.status === 'read' ? 'text-blue-300' : msg?.status === 'sending' ? 'text-gray-400 opacity-50' : ''}`}>
                        {msg?.status === 'sending' ? 'schedule' : msg?.status === 'sent' ? 'check' : 'done_all'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-800 rounded-xl rounded-tl-none p-2 shadow-sm max-w-[80%]">
                  <a href={msg?.fileUrl ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${msg?.fileUrl}` : '#'} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden mb-2 hover:opacity-90 transition-opacity">
                    <div className="bg-[#FAFAFA] dark:bg-[#171717] p-4 flex items-center gap-3 border border-gray-200 dark:border-gray-800">
                      <div className="w-10 h-10 bg-white dark:bg-[#262626] rounded flex items-center justify-center border border-gray-200 dark:border-gray-800">
                        <span className="material-icons text-[#7C3AED]">description</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#171717] dark:text-[#F5F5F5] text-sm font-medium">{msg?.fileName || 'Attachment'}</span>
                        {msg?.fileSize && <span className="text-gray-400 text-[10px]">{msg?.fileSize}</span>}
                      </div>
                    </div>
                  </a>
                  <p className="text-[#171717] dark:text-[#F5F5F5] text-sm px-1 mb-1">{msg?.content}</p>
                  <span className="block text-right text-[10px] text-gray-400">{msg?.time}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <footer className="p-4 bg-white dark:bg-[#262626] border-t border-gray-200 dark:border-gray-800 shrink-0">
          {/* Show blocked banner for 1-to-1 chats when user is blocked */}
          {!isGroup && isBlocked ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
              <span className="material-icons-round text-[18px]">block</span>
              <span>You cannot send messages to this user.</span>
              <button onClick={handleToggleBlock} className="ml-2 text-xs underline text-red-400 hover:text-red-600">Unblock</button>
            </div>
          ) : (
          <div className="max-w-4xl mx-auto flex items-end gap-3 relative">
            
            {/* Task 3: The Missing Group Post Icon (+) */}
            {isGroup && (
              <button 
                onClick={() => setShowGroupPostModal(true)}
                className="mb-2 text-[#7C3AED] hover:bg-[#7C3AED]/10 w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-icons-round text-[22px]">add_circle</span>
              </button>
            )}

            {/* Task 2: Attachment Menu */}
            <div className="relative mb-2">
              <button 
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="text-gray-400 hover:text-[#7C3AED] w-9 h-9 flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-icons">attach_file</span>
              </button>

              {/* Hidden File Inputs */}
              <input type="file" ref={documentInputRef} className="hidden" />
              <input type="file" accept="image/*,video/*" ref={photoInputRef} className="hidden" />
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" />

              {/* Attachment Dropdown */}
              {showAttachmentMenu && (
                <div className="absolute bottom-full left-0 mb-4 bg-white dark:bg-[#262626] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 flex flex-col gap-1 z-50 min-w-[160px]">
                  <button onClick={() => { setShowAttachmentMenu(false); documentInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] rounded-lg text-sm text-[#171717] dark:text-[#F5F5F5] transition-colors font-medium">
                    <span className="material-icons-round text-blue-500">description</span> Document
                  </button>
                  <button onClick={() => { setShowAttachmentMenu(false); photoInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] rounded-lg text-sm text-[#171717] dark:text-[#F5F5F5] transition-colors font-medium">
                    <span className="material-icons-round text-purple-500">image</span> Photo
                  </button>
                  <button onClick={() => { setShowAttachmentMenu(false); cameraInputRef.current?.click(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] rounded-lg text-sm text-[#171717] dark:text-[#F5F5F5] transition-colors font-medium">
                    <span className="material-icons-round text-pink-500">photo_camera</span> Camera
                  </button>
                </div>
              )}
            </div>

            {/* Input Area: Switches between WhatsApp Audio UI and Text UI */}
            <div className="flex-1 relative bg-[#FAFAFA] dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 py-1.5 focus-within:border-[#7C3AED] transition-colors min-w-0">
              
              {isRecording ? (
                // Task 1: WhatsApp-Style Audio Recorder UI
                <div className="w-full flex items-center justify-between py-1.5 duration-300">
                  <div className="flex items-center gap-3 text-red-500">
                    <span className="material-icons-round text-[10px] animate-pulse">circle</span>
                    <span className="font-mono text-[15px] font-bold tracking-wider">{formatTime(recordingTime)}</span>
                  </div>
                  <div className="flex items-center gap-5 text-gray-500">
                    <button onClick={cancelRecording} className="hover:text-red-500 transition-colors" title="Cancel Recording">
                      <span className="material-icons-round">delete</span>
                    </button>
                    <button onClick={togglePauseResume} className="hover:text-[#7C3AED] transition-colors" title={isPaused ? "Resume" : "Pause"}>
                      <span className="material-icons-round">{isPaused ? 'play_circle' : 'pause_circle'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Normal Text Input UI
                <>
                  {showEmojiPicker && (
                    <div className="absolute bottom-[calc(100%+10px)] right-0 z-[50] shadow-2xl rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5">
                      <EmojiPicker theme={Theme.AUTO} onEmojiClick={onEmojiClick} />
                    </div>
                  )}
                  <textarea 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-[15px] py-2.5 resize-none text-[#171717] dark:text-[#F5F5F5] placeholder-gray-400 outline-none hide-scrollbar" 
                      placeholder="Write a message..."
                      rows={1}
                  />
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`ml-4 transition-colors shrink-0 ${showEmojiPicker ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-[#7C3AED]'}`}>
                      <span className="material-icons">sentiment_satisfied_alt</span>
                  </button>
                  <button onClick={startRecording} className="ml-3 text-gray-400 hover:text-[#7C3AED] transition-colors shrink-0">
                      <span className="material-icons">mic</span>
                  </button>
                </>
              )}
            </div>

            {/* Task 2: Functional Send Button */}
            <button 
              onClick={isRecording ? stopRecordingAndSend : handleSendMessage}
              className={`text-white w-[42px] h-[42px] rounded-xl flex items-center justify-center shadow-md shrink-0 transition-all duration-300 ${
                (messageText.trim() || isRecording) 
                  ? 'bg-[#7C3AED] hover:bg-[#6D28D9] scale-100 opacity-100' 
                  : 'bg-gray-300 dark:bg-gray-700 scale-95 opacity-50 cursor-not-allowed'
              }`}
              disabled={!messageText.trim() && !isRecording}
            >
              <span className="material-icons text-[20px]">send</span>
            </button>
          </div>
          )}
        </footer>
      </main>

      {/* Task 4: Slide-out Side Panel */}
      {activeSidePanel && (
        <aside className="w-[340px] bg-white dark:bg-[#262626] border-l border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300 relative z-10 shrink-0 animate-in slide-in-from-right-8 fade-in">
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={() => setActiveSidePanel(null)} className="text-gray-400 hover:text-red-500 transition-colors">
              <span className="material-icons-round">close</span>
            </button>
            <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5]">
              {activeSidePanel === 'details' ? (isGroup ? 'Group Info' : 'Contact Info') : 'Search Messages'}
            </h3>
            {activeSidePanel === 'details' ? (
              isGroup && (
                <button 
                  onClick={() => setShowEditGroupModal(true)} 
                  className="text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
                >
                  <span className="material-icons-round text-xl">edit</span>
                </button>
              )
            ) : (
              <div className="w-6"></div> // spacer
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
            {activeSidePanel === 'details' ? (
              <div className="flex flex-col">
                
                {/* 1. Profile Header */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#ec4899] text-white flex items-center justify-center text-4xl font-bold shadow-lg">
                      {isGroup ? 'G' : chatName.charAt(0)}
                    </div>
                    {/* Online Dot */}
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#10B981] border-4 border-white dark:border-[#262626] rounded-full"></div>
                  </div>
                  <h3 className="font-bold text-xl text-[#171717] dark:text-[#F5F5F5] text-center mb-1">{chatName}</h3>
                  <p className="text-sm text-gray-500 text-center">
                    {isGroup ? `${groupMembers?.length || 0} members, 1 online` : (isOnline ? 'Online' : 'Offline')}
                  </p>
                </div>

                {/* 2. Action Buttons */}
                <div className="flex justify-between items-center w-full px-2 mb-8">
                  {isGroup && canAddMembers && (
                    <div 
                      className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowAddMemberModal(true)}
                    >
                      <div className="w-12 h-12 rounded-full bg-[#FAFAFA] dark:bg-[#171717] border border-gray-100 dark:border-gray-800 flex items-center justify-center text-[#7C3AED]">
                        <span className="material-icons-round">person_add</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">Add</span>
                    </div>
                  )}
                  
                  <div 
                    className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setIsMuted(!isMuted);
                      toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
                    }}
                  >
                    <div className={`w-12 h-12 rounded-full bg-[#FAFAFA] dark:bg-[#171717] border border-gray-100 dark:border-gray-800 flex items-center justify-center ${isMuted ? 'text-[#7C3AED]' : 'text-gray-500 dark:text-gray-400'}`}>
                      <span className="material-icons-round">{isMuted ? 'notifications_off' : 'notifications'}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </div>
                  
                  <div 
                    className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => setActiveSidePanel('search')}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAFAFA] dark:bg-[#171717] border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <span className="material-icons-round">search</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Search</span>
                  </div>
                  
                  {isGroup && (
                    <div 
                      className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowLeaveConfirmModal(true)}
                    >
                      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center text-red-500">
                        <span className="material-icons-round">exit_to_app</span>
                      </div>
                      <span className="text-xs text-red-500 font-medium">Leave</span>
                    </div>
                  )}
                </div>

                {/* 3. About Section */}
                <div className="w-full bg-[#FAFAFA] dark:bg-[#171717] rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-2">About</h4>
                  <p className="text-sm text-[#171717] dark:text-[#F5F5F5] leading-relaxed">
                    {isGroup ? 'Welcome to the group! We discuss frontend development, React, and modern UI/UX design patterns.' : 'Hey there! I am using Rabta.'}
                  </p>
                </div>

                {/* 4. Invite Link Section */}
                {isGroup && canAddMembers && (
                  <div className="w-full bg-[#FAFAFA] dark:bg-[#171717] rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-2">Invite Link</h4>
                    <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
                      <span className="text-sm text-gray-500 truncate select-all">https://rabta.app/g/react2026</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('https://rabta.app/g/react2026');
                          toast.success("Link copied!");
                        }}
                        className="text-[#7C3AED] hover:text-[#6D28D9] shrink-0 transition-colors"
                      >
                        <span className="material-icons-round text-lg">content_copy</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Tabs Section */}
                <div className="flex items-center gap-1 bg-[#FAFAFA] dark:bg-[#171717] p-1 rounded-xl mb-4 border border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => setActiveTab('Members')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'Members' ? 'bg-white dark:bg-[#262626] text-[#7C3AED] shadow-sm' : 'text-gray-500 hover:text-[#171717] dark:hover:text-[#F5F5F5]'}`}
                  >
                    Members
                  </button>
                  <button 
                    onClick={() => setActiveTab('Media')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'Media' ? 'bg-white dark:bg-[#262626] text-[#7C3AED] shadow-sm' : 'text-gray-500 hover:text-[#171717] dark:hover:text-[#F5F5F5]'}`}
                  >
                    Media
                  </button>
                  <button 
                    onClick={() => setActiveTab('Posts')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'Posts' ? 'bg-white dark:bg-[#262626] text-[#7C3AED] shadow-sm' : 'text-gray-500 hover:text-[#171717] dark:hover:text-[#F5F5F5]'}`}
                  >
                    Posts
                  </button>
                </div>

                {/* 6. Tab Content Area */}
                <div className="w-full">
                  {activeTab === 'Members' && (
                    <div className="flex flex-col gap-3">
                      {groupMembers?.length ? groupMembers.map((member, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-[#FAFAFA] dark:hover:bg-[#171717] rounded-xl cursor-pointer transition-colors">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 shrink-0">
                            {member.charAt(0)}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] truncate">{member}</span>
                            <span className="text-xs text-gray-500">Member</span>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center text-sm text-gray-500 py-4">No members to display.</div>
                      )}
                    </div>
                  )}

                  {activeTab === 'Media' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    </div>
                  )}

                  {activeTab === 'Posts' && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <span className="material-icons-round text-4xl opacity-20 mb-2">article</span>
                      <p className="text-sm">No posts yet.</p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                  <input 
                    type="text" 
                    placeholder="Search in chat..." 
                    className="w-full bg-[#FAFAFA] dark:bg-[#171717] border border-gray-200 dark:border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#7C3AED] text-[#171717] dark:text-[#F5F5F5]"
                  />
                </div>
                <div className="text-center text-gray-400 text-sm mt-10">
                  <span className="material-icons-round text-4xl opacity-20 mb-2 block">search</span>
                  Search for messages
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Task 4: Group Post Modal */}
      {showGroupPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#262626] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Create Group Post</h2>
              <button onClick={() => setShowGroupPostModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div className="p-6">
              <textarea 
                className="w-full h-32 bg-[#FAFAFA] dark:bg-[#171717] border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-[#171717] dark:text-[#F5F5F5] resize-none focus:outline-none focus:border-[#7C3AED] transition-colors"
                placeholder="What's on your mind? Share with the group..."
              ></textarea>
              <div className="flex items-center gap-3 mt-4">
                <button className="text-gray-400 hover:text-[#7C3AED] transition-colors">
                  <span className="material-icons-round">image</span>
                </button>
                <button className="text-gray-400 hover:text-[#7C3AED] transition-colors">
                  <span className="material-icons-round">poll</span>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#1f1f1f] flex justify-end gap-3">
              <button onClick={() => setShowGroupPostModal(false)} className="px-5 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium">
                Cancel
              </button>
              <button onClick={() => { setShowGroupPostModal(false); toast.success("Post created in group!"); }} className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-medium transition-colors">
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logic Task: Edit Group Modal */}
      {showEditGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Edit Group Info</h2>
              <button onClick={() => setShowEditGroupModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">Group Name</label>
              <input type="text" defaultValue={chatName} className="w-full bg-[#FAFAFA] dark:bg-[#171717] border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:border-[#7C3AED] mb-4" />
              
              <label className="block text-sm font-medium text-gray-500 mb-2">Description</label>
              <textarea rows={3} defaultValue="Welcome to the group! We discuss frontend development, React, and modern UI/UX design patterns." className="w-full bg-[#FAFAFA] dark:bg-[#171717] border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-[#171717] dark:text-[#F5F5F5] resize-none focus:outline-none focus:border-[#7C3AED]"></textarea>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#1f1f1f] flex justify-end gap-3">
              <button onClick={() => setShowEditGroupModal(false)} className="px-5 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium">Cancel</button>
              <button onClick={() => { setShowEditGroupModal(false); toast.success("Group info updated"); }} className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-medium transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Logic Task: Add Member Modal with Search */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5]">Add Member</h2>
              <button onClick={() => { setShowAddMemberModal(false); setUserSearchQuery(""); }} className="text-gray-400 hover:text-red-500 transition-colors">
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {/* Search Bar */}
              <div className="relative mb-6">
                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input 
                  type="text" 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..." 
                  className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] dark:bg-[#171717] border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:border-[#7C3AED] transition-colors text-[#171717] dark:text-[#F5F5F5]"
                  autoFocus
                />
              </div>

              {/* Results Area */}
              <div className="flex flex-col gap-2">
                {isSearchingUsers ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-[#FAFAFA] dark:bg-[#171717] rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center font-bold">
                          {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : user.fullName.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-[#171717] dark:text-[#F5F5F5] truncate">{user.fullName}</span>
                          <span className="text-xs text-gray-500 truncate">{user.email || user.role}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddUserToGroup(user._id)}
                        className="px-4 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))
                ) : userSearchQuery.trim().length >= 2 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">No users found matching "{userSearchQuery}"</div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm italic">Type at least 2 characters to search...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logic Task: Leave Confirm Modal */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#262626] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                <span className="material-icons-round text-3xl">warning</span>
              </div>
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">Leave Group?</h2>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to leave this group? You won't receive any more messages from it.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveConfirmModal(false)} className="flex-1 py-3 text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium">Cancel</button>
                <button 
                  onClick={async () => {
                    try {
                      await axiosInstance.put(`/chats/group/${chatId}/leave`);
                      toast.success("You left the group");
                      setShowLeaveConfirmModal(false);
                      setActiveSidePanel(null);
                      // In a real app, redirect or clear chat here
                    } catch(err) {
                      toast.error("Failed to leave group");
                    }
                  }} 
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};