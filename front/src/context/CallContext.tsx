import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Peer from 'simple-peer';
import { useChat } from './ChatContext';

export type CallType = 'voice' | 'video';

export interface GroupPeer {
  peerId: string;
  stream?: MediaStream;
}

interface CallContextType {
  stream?: MediaStream;
  myVideo: React.MutableRefObject<HTMLVideoElement | null>;
  userVideo: React.MutableRefObject<HTMLVideoElement | null>;
  
  callUser: (idToCall: string, name: string, type?: CallType, avatar?: string, chatId?: string) => void;
  answerCall: () => void;
  
  callGroup: (groupId: string, name: string, type?: CallType) => void;
  answerGroupCall: () => void;
  isGroupCall: boolean;
  groupPeers: GroupPeer[];

  leaveCall: () => void;

  receivingCall: boolean;
  callerName: string;
  callerAvatar: string;
  callType: CallType;
  callAccepted: boolean;
  callEnded: boolean;
  isCalling: boolean;
  calleeName: string;
  calleeAvatar: string;
  callDuration: number;
  isMinimized: boolean;
  toggleMinimize: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useChat();

  const [stream, setStream]               = useState<MediaStream>();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller]               = useState('');
  const [callerName, setCallerName]       = useState('');
  const [callerAvatar, setCallerAvatar]   = useState('');
  const [callerSignal, setCallerSignal]   = useState<Peer.SignalData>();
  
  const [callAccepted, setCallAccepted]   = useState(false);
  const [callEnded, setCallEnded]         = useState(false);
  const [isCalling, setIsCalling]         = useState(false);
  const [callType, setCallType]           = useState<CallType>('video');
  const [callId, setCallId]               = useState('');
  const [activeChatId, setActiveChatId]   = useState(''); // chat room to emit summary to
  
  const [calleeId, setCalleeId]           = useState('');
  const [calleeName, setCalleeName]       = useState('');
  const [calleeAvatar, setCalleeAvatar]   = useState('');
  const [callDuration, setCallDuration]   = useState(0);
  const [isMinimized, setIsMinimized]     = useState(false);
  
  // Group state
  const [isGroupCall, setIsGroupCall]     = useState(false);
  const [groupPeers, setGroupPeers]       = useState<GroupPeer[]>([]);

  const myVideo        = useRef<HTMLVideoElement | null>(null);
  const userVideo      = useRef<HTMLVideoElement | null>(null);
  const connectionRef  = useRef<Peer.Instance | null>(null);
  const peersRef       = useRef<Array<{ peerId: string, peer: Peer.Instance }>>([]);
  const ringTimeout    = useRef<NodeJS.Timeout | null>(null);
  const durationTimer  = useRef<NodeJS.Timeout | null>(null);
  const callStartRef   = useRef<number>(0);

  const getMe = () => JSON.parse(localStorage.getItem('user') || '{}');

  const startDurationTimer = () => {
    callStartRef.current = Date.now();
    if (durationTimer.current) clearInterval(durationTimer.current);
    durationTimer.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
  };

  const resetCallState = () => {
    setCallEnded(true);
    setIsCalling(false);
    setCallDuration(0);
    setIsMinimized(false);
    setIsGroupCall(false);
    callStartRef.current = 0;

    if (durationTimer.current) { clearInterval(durationTimer.current); durationTimer.current = null; }
    if (ringTimeout.current) { clearTimeout(ringTimeout.current); ringTimeout.current = null; }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(undefined);
    }
    if (myVideo.current) myVideo.current.srcObject = null;
    if (userVideo.current) userVideo.current.srcObject = null;
    
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    setGroupPeers([]);

    setTimeout(() => {
      setCallAccepted(false);
      setCallEnded(false);
      setReceivingCall(false);
      setCaller('');
      setCallerName('');
      setCallerAvatar('');
      setCallId('');
      setCalleeId('');
      setCalleeName('');
      setCalleeAvatar('');
      setCallerSignal(undefined);
    }, 1000);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', (data: any) => {
      setReceivingCall(true); setCaller(data.from); setCallerName(data.callerName);
      setCallerAvatar(data.callerAvatar || ''); setCallerSignal(data.signal);
      setCallId(data.callId); setCallType(data.callType || 'video');
      setIsGroupCall(false);
      if (data.chatId) setActiveChatId(data.chatId); // ✅ receiver also needs chatId for summary
    });

    socket.on('incoming-group-call', (data: any) => {
      setReceivingCall(true); setCaller(data.groupId); setCallerName(data.callerName + ' (Group)');
      setCallId(data.callId); setCallType(data.callType || 'video');
      setIsGroupCall(true);
      setActiveChatId(data.groupId); // ✅ group chatId = groupId
    });

    socket.on('call-rejected', () => resetCallState());
    socket.on('call-cancelled', () => resetCallState());
    socket.on('call-ended', () => resetCallState());
    socket.on('call-delivered', (data: { callId: string }) => setCallId(data.callId));

    // Mesh WebRTC Handlers
    socket.on('all-users-in-group', (usersInRoom: string[]) => {
      const peers: GroupPeer[] = [];
      const me = getMe();
      usersInRoom.forEach(userId => {
        const peer = createPeer(userId, socket.id || '', stream!);
        peersRef.current.push({ peerId: userId, peer });
        peers.push({ peerId: userId });
      });
      setGroupPeers(peers);
    });

    socket.on('user-joined-group', (payload: any) => {
      // If we are the caller and this is the first person to join, mark as accepted and start timer
      if (isCalling && !callAccepted) {
        setCallAccepted(true);
        setIsCalling(false);
        startDurationTimer();
      }
      
      const peer = addPeer(payload.signal, payload.callerID, stream!);
      peersRef.current.push({ peerId: payload.callerID, peer });
      setGroupPeers(users => [...users, { peerId: payload.callerID }]);
    });

    socket.on('receiving-returned-signal', (payload: any) => {
      const item = peersRef.current.find(p => p.peerId === payload.id);
      item?.peer.signal(payload.signal);
    });

    socket.on('user-left-group', (userId: string) => {
      const peerObj = peersRef.current.find(p => p.peerId === userId);
      if (peerObj) peerObj.peer.destroy();
      peersRef.current = peersRef.current.filter(p => p.peerId !== userId);
      setGroupPeers(users => users.filter(u => u.peerId !== userId));
    });

    return () => {
      socket.off('incoming-call'); socket.off('incoming-group-call');
      socket.off('call-rejected'); socket.off('call-cancelled');
      socket.off('call-ended'); socket.off('call-delivered');
      socket.off('all-users-in-group'); socket.off('user-joined-group');
      socket.off('receiving-returned-signal'); socket.off('user-left-group');
    };
  }, [socket, stream, resetCallState]);

  const toggleMinimize = () => setIsMinimized(prev => !prev);

  function createPeer(userToSignal: string, callerID: string, currentStream: MediaStream) {
    const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });
    peer.on('signal', signal => {
      socket?.emit('sending-group-signal', { userToSignal, callerID, signal });
    });
    peer.on('stream', userStream => {
      setGroupPeers(users => users.map(u => u.peerId === userToSignal ? { ...u, stream: userStream } : u));
    });
    return peer;
  }

  function addPeer(incomingSignal: any, callerID: string, currentStream: MediaStream) {
    const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });
    peer.on('signal', signal => {
      socket?.emit('returning-group-signal', { signal, callerID });
    });
    peer.on('stream', userStream => {
      setGroupPeers(users => users.map(u => u.peerId === callerID ? { ...u, stream: userStream } : u));
    });
    peer.signal(incomingSignal);
    return peer;
  }

  const callUser = async (idToCall: string, name: string, type: CallType = 'video', avatar = '', chatId?: string) => {
    const me = getMe();
    try {
      setIsCalling(true); setCalleeName(name); setCalleeId(idToCall);
      setCalleeAvatar(avatar); setCallType(type); setIsGroupCall(false);
      if (chatId) setActiveChatId(chatId); // ✅ store for leaveCall

      const constraints = type === 'voice' ? { video: false, audio: true } : { video: true, audio: true };
      const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });
      peer.on('signal', signalData => {
        socket?.emit('call-user', {
          userToCall: idToCall,
          signalData,
          from: me._id || me.id || '',
          callerName: me.fullName || 'Unknown',
          callerAvatar: me.avatar || '',
          callType: type,
          chatId // ✅ forward the known chatId so backend doesn't need to guess
        });
      });
      peer.on('stream', userStream => { if (userVideo.current) userVideo.current.srcObject = userStream; });

      socket?.on('call-accepted', (signal: Peer.SignalData) => {
        setCallAccepted(true); setIsCalling(false);
        peer.signal(signal); startDurationTimer();
      });

      ringTimeout.current = setTimeout(() => {
        if (!callAccepted) { socket?.emit('cancel-call', { callId, to: idToCall }); resetCallState(); }
      }, 30_000);

      connectionRef.current = peer;
    } catch { setIsCalling(false); }
  };

  const callGroup = async (groupId: string, name: string, type: CallType = 'video') => {
    const me = getMe();
    try {
      setIsCalling(true); setCallAccepted(false); setCalleeName(name); setCalleeId(groupId);
      setCallType(type); setIsGroupCall(true);
      setActiveChatId(groupId); // ✅ for group calls, chatId === groupId

      const constraints = type === 'voice' ? { video: false, audio: true } : { video: true, audio: true };
      const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      socket?.emit('start-group-call', { groupId, callerId: me._id || me.id || '', callerName: me.fullName || 'Unknown', callType: type });
      socket?.emit('join-group-room', { groupId, isCaller: true });
      
      // Timer starts when first user joins
    } catch { resetCallState(); }
  };

  const answerCall = async () => {
    setCallAccepted(true); setReceivingCall(false);
    try {
      const constraints = callType === 'voice' ? { video: false, audio: true } : { video: true, audio: true };
      const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });
      peer.on('signal', signalData => socket?.emit('answer-call', { to: caller, signal: signalData, callId }));
      peer.on('stream', userStream => { if (userVideo.current) userVideo.current.srcObject = userStream; });

      if (callerSignal) peer.signal(callerSignal);
      connectionRef.current = peer; startDurationTimer();
    } catch {}
  };

  const answerGroupCall = async () => {
    setCallAccepted(true); setReceivingCall(false);
    try {
      const constraints = callType === 'voice' ? { video: false, audio: true } : { video: true, audio: true };
      const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      socket?.emit('join-group-room', { groupId: caller, callId, isCaller: false }); // 'caller' stores groupId in group calls
      startDurationTimer();
    } catch {}
  };

  const leaveCall = () => {
    const me = getMe();
    const durationSecs = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0;
    
    // Determine final status
    const finalStatus = durationSecs > 0 ? 'completed' : 'missed';
    
    // Ensure we have a valid caller ID
    const callerId = me._id || me.id;

    // Build ONE unified payload just like the Group logic
    const unifiedCallData = {
      callId: callId || "", // We still pass callId for DB lookup
      caller: callerId,
      receiver: isGroupCall ? (calleeId || caller) : (caller || calleeId), // Extracted ID
      receiverModel: isGroupCall ? 'Group' : 'User',
      chatId: activeChatId,
      type: callType || 'video',
      status: finalStatus,
      duration: durationSecs
    };

    if (isGroupCall) {
      socket?.emit('leave-group-room', { groupId: calleeId || caller });
    }

    if (callAccepted) {
      console.log("FINAL EMITTING CALL DATA (ENDED):", JSON.stringify(unifiedCallData, null, 2));
      socket?.emit('end-call', unifiedCallData);
    } else if (isCalling) {
      console.log("FINAL EMITTING CALL DATA (CANCELLED):", JSON.stringify(unifiedCallData, null, 2));
      socket?.emit('cancel-call', unifiedCallData);
    } else if (receivingCall && !isGroupCall) {
      unifiedCallData.status = 'rejected';
      console.log("FINAL EMITTING CALL DATA (REJECTED):", JSON.stringify(unifiedCallData, null, 2));
      socket?.emit('reject-call', unifiedCallData);
    }

    setActiveChatId('');
    resetCallState();
  };

  return (
    <CallContext.Provider value={{
      stream, myVideo, userVideo, callUser, answerCall, callGroup, answerGroupCall, isGroupCall, groupPeers, leaveCall,
      receivingCall, callerName, callerAvatar, callType, callAccepted, callEnded,
      isCalling, calleeName, calleeAvatar, callDuration, isMinimized, toggleMinimize
    }}>
      {children}
    </CallContext.Provider>
  );
};
