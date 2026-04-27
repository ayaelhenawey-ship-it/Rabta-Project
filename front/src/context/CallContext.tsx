import React, { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import Peer from 'simple-peer';
import { useChat } from './ChatContext';

interface CallContextType {
  stream: MediaStream | undefined;
  myVideo: React.MutableRefObject<HTMLVideoElement | null>; 
  userVideo: React.MutableRefObject<HTMLVideoElement | null>; 
  callUser: (idToCall: string, name: string) => void;
  answerCall: () => void;
  leaveCall: () => void;
  receivingCall: boolean;
  callerName: string;
  callAccepted: boolean;
  callEnded: boolean;
  isCalling: boolean;
  calleeName: string;
}

const CallContext = createContext<CallContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within a CallProvider");
  return context;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useChat();

  // 💡 حل مشكلة myUserName و myUserId:
  // هنا المفروض تسحبهم من الـ AuthContext بتاعك
  // مؤقتاً هنحط قيم تجريبية عشان الإيرور يختفي
  const myUserId = "YOUR_MONGO_ID_HERE"; 
  const myUserName = "اسمك الحالي";

  const [stream, setStream] = useState<MediaStream>();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerSignal, setCallerSignal] = useState<Peer.SignalData | undefined>(undefined);
  const [callId, setCallId] = useState('');
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  
  const [isCalling, setIsCalling] = useState(false);
  const [calleeName, setCalleeName] = useState('');

  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data: { from: string, callerName: string, signal: Peer.SignalData, callId: string }) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.callerName);
      setCallerSignal(data.signal);
      setCallId(data.callId);
    });

    return () => {
      socket.off('incoming-call');
    };
  }, [socket]);

  const callUser = async (idToCall: string, name: string) => {
    try {
      setIsCalling(true);
      setCalleeName(name);

      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream
      });

      peer.on('signal', (data) => {
        // 💡 حل مشكلة socket is possibly null باستخدام العلامة الآمنة ?.
        socket?.emit('call-user', {
          userToCall: idToCall,
          signalData: data,
          from: myUserId, 
          callerName: myUserName
        });
      });

      peer.on('stream', (userStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = userStream;
        }
      });

      socket?.on('call-accepted', (signal: Peer.SignalData) => {
        setCallAccepted(true);
        setIsCalling(false); 
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } catch (err) {

      setIsCalling(false);
    }
  };

  const answerCall = async () => {
    setCallAccepted(true);
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream
      });

      peer.on('signal', (data) => {
        socket?.emit('answer-call', { 
          to: caller, 
          signal: data, 
          callId: callId 
        });
      });

      peer.on('stream', (userStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = userStream;
        }
      });

      if (callerSignal) {
        peer.signal(callerSignal);
      }
      connectionRef.current = peer;
    } catch (err) {

    }
  };

  const leaveCall = () => {
    setCallEnded(true);
    setIsCalling(false);
    connectionRef.current?.destroy();
    
    if (callAccepted || isCalling) {
       socket?.emit('end-call', { to: caller, callId: callId });
    }
    
    window.location.reload(); 
  };

  return (
    <CallContext.Provider value={{
      stream, myVideo, userVideo, callUser, answerCall, leaveCall, 
      receivingCall, callerName, callAccepted, callEnded,
      isCalling, calleeName
    }}>
      {children}
    </CallContext.Provider>
  );
};