import React, { useState, useRef } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { useChat } from '../../context/ChatContext';

export type MessageType = {
  id: string;
  type: 'text' | 'file' | 'audio';
  content?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  time: string;
  isMine: boolean;
};

interface ChatWindowProps {
  chatId?: string;
  chatName: string;
  isOnline: boolean;
  isGroup?: boolean;
  messages: MessageType[];
  groupMembers?: string[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, chatName, isOnline, isGroup = false, messages, groupMembers }) => {
  const { socket } = useChat();
  const [localMessages, setLocalMessages] = useState<MessageType[]>(messages);

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
          return {
            id: m._id,
            content: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMine: (m.senderId?._id || m.senderId) === JSON.parse(localStorage.getItem('user') || '{}')._id,
            type: isAudio ? 'audio' : (m.messageType || 'text'),
            fileUrl: isAudio ? m.content : undefined
          };
        });
        setLocalMessages(formatted.reverse()); // Ensure chronological order if needed, but the backend sorts descending
      } catch (err) {
        setLocalMessages(messages);
      }
    };
    
    fetchMessages();
  }, [chatId]); // Fetch whenever the chat changes

  // Listen to live socket messages for this specific chat
  React.useEffect(() => {
    if (!socket || !chatId) return;

    const handleReceiveMessage = (message: any) => {
      // Only process messages that belong to the active ChatWindow
      if (message.chatId === chatId) {
        const isAudio = message.messageType === 'audio' || (message.content && message.content.startsWith('blob:'));
        const newMsg: MessageType = {
          id: message._id,
          content: message.content,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMine: (message.senderId?._id || message.senderId) === JSON.parse(localStorage.getItem('user') || '{}')._id,
          type: isAudio ? 'audio' : (message.messageType || 'text'),
          fileUrl: isAudio ? message.content : undefined
        };
        
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
  const [showGroupPostModal, setShowGroupPostModal] = useState(false);
  
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
        console.log("Recorded Audio ready for backend upload:", audioBlob);
        
        // In a real app, we upload the blob to S3/Cloudinary, get URL, then send to backend.
        // For now, we mock the URL with a local object URL to render the player immediately.
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (socket) {
          socket.emit('send-message', { 
            chatId, 
            content: audioUrl, 
            messageType: 'audio' 
          });
          toast.success("Voice note sent");
        } else {
          toast.error("Network disconnected");
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setRecordingTime(0);
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    if (socket) {
      socket.emit('send-message', { chatId, content: messageText, messageType: 'text' });
      setMessageText("");
    } else {
      toast.error("Network disconnected");
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
          className="h-16 px-6 bg-white/80 dark:bg-[#262626]/80 backdrop-blur-md flex items-center justify-between border-b border-gray-200 dark:border-gray-800 z-10 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 shrink-0 transition-colors"
        >
          <div className="flex flex-col min-w-0">
            <h2 className="text-[#171717] dark:text-[#F5F5F5] font-bold text-base truncate">{chatName}</h2>
            {isGroup ? (
              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {groupMembers && groupMembers.filter(Boolean).length > 0 
                  ? (groupMembers.filter(Boolean).length <= 2 
                      ? groupMembers.filter(Boolean).join(", ") 
                      : `${groupMembers.filter(Boolean).slice(0, 2).join(", ")}, +${groupMembers.filter(Boolean).length - 2} others`)
                  : "Group members"}
              </span>
            ) : (
              isOnline && <span className="text-[#7C3AED] dark:text-[#8B5CF6] text-xs font-medium">Online</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-400 dark:text-gray-500 shrink-0 relative">
            
            {/* Task 3: Call Menu */}
            <div className="relative">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <button 
                  onClick={(e) => { e.stopPropagation(); console.log('Video Call Action'); }}
                  className="px-2.5 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#7C3AED] transition-colors"
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
                  <button onClick={(e) => { e.stopPropagation(); setShowCallMenu(false); console.log("Video Call"); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                    <span className="material-icons-round text-[#7C3AED] text-[18px]">videocam</span> Video Call
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowCallMenu(false); console.log("Voice Call"); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
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
                      <button onClick={(e) => { e.stopPropagation(); setActiveSidePanel('search'); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">search</span> Search
                      </button>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">person_add</span> Add Member
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
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          try {
                            await axiosInstance.put(`/chats/group/${chatId}/leave`);
                            toast.success("Exited group");
                            setShowOptionsMenu(false);
                            setTimeout(() => window.location.reload(), 500);
                          } catch (err) {
                            toast.error("Failed to exit group");
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-red-500"
                      >
                        <span className="material-icons-round text-[18px]">logout</span> Exit Group
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setActiveSidePanel('details'); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">account_circle</span> View Contact
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setActiveSidePanel('search'); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">search</span> Search
                      </button>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-[#171717] dark:text-[#F5F5F5]">
                        <span className="material-icons-round text-[18px]">perm_media</span> Media, Links, and Docs
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
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] flex items-center gap-3 text-sm text-red-500">
                        <span className="material-icons-round text-[18px]">block</span> Block Contact
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

          {localMessages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'} w-full`}>
              {msg.type === 'text' ? (
                <div className={`${msg.isMine ? 'bg-[#7C3AED] text-white rounded-tr-none' : 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#F5F5F5] border border-gray-200 dark:border-gray-800 rounded-tl-none'} rounded-xl p-3 shadow-sm max-w-[80%]`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`flex justify-end items-center gap-1 mt-1 ${msg.isMine ? 'text-white/80' : 'text-gray-400'}`}>
                    <span className="text-[10px]">{msg.time}</span>
                    {msg.isMine && <span className="material-icons text-[12px]">done_all</span>}
                  </div>
                </div>
              ) : msg.type === 'audio' ? (
                <div className={`${msg.isMine ? 'bg-[#7C3AED] text-white rounded-tr-none' : 'bg-white dark:bg-[#262626] text-[#171717] dark:text-[#F5F5F5] border border-gray-200 dark:border-gray-800 rounded-tl-none'} rounded-xl p-3 shadow-sm max-w-[80%] flex items-center gap-3`}>
                  <audio controls src={msg.fileUrl || msg.content} className="h-10 w-48 custom-audio-player" />
                  <div className={`flex flex-col justify-end items-end gap-1 mt-1 ${msg.isMine ? 'text-white/80' : 'text-gray-400'}`}>
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
        </footer>
      </main>

      {/* Task 4: Slide-out Side Panel */}
      {activeSidePanel && (
        <aside className="w-[340px] bg-white dark:bg-[#262626] border-l border-gray-200 dark:border-gray-800 flex flex-col transition-colors duration-300 relative z-10 shrink-0 animate-in slide-in-from-right-8 fade-in">
          <div className="h-16 flex items-center px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={() => setActiveSidePanel(null)} className="mr-3 text-gray-400 hover:text-red-500 transition-colors">
              <span className="material-icons-round">close</span>
            </button>
            <h3 className="font-bold text-[#171717] dark:text-[#F5F5F5]">
              {activeSidePanel === 'details' ? (isGroup ? 'Group Info' : 'Contact Info') : 'Search Messages'}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
            {activeSidePanel === 'details' ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center text-3xl font-bold mb-4">
                  {isGroup ? 'G' : chatName.charAt(0)}
                </div>
                <h3 className="font-bold text-xl text-[#171717] dark:text-[#F5F5F5] text-center mb-1">{chatName}</h3>
                {isGroup ? (
                  <p className="text-sm text-gray-500 mb-6">{groupMembers?.length || 0} members</p>
                ) : (
                  <p className="text-sm text-gray-500 mb-6">{isOnline ? 'Online' : 'Offline'}</p>
                )}
                
                {/* Additional mocked details */}
                <div className="w-full bg-[#FAFAFA] dark:bg-[#171717] rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Media, Links, Docs</h4>
                  <div className="flex gap-2 opacity-50">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                  </div>
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
    </div>
  );
};