import React from 'react';
import { useCall } from '../../context/CallContext';

export const OutgoingCallModal = () => {
  const { isCalling, callAccepted, calleeName, leaveCall } = useCall();
  if (!isCalling || callAccepted) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center text-white">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-20"></div>
        <img src="/default-avatar.png" className="w-32 h-32 rounded-full border-4 border-purple-500/50" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">{calleeName}</h2>
      <p className="text-purple-400 animate-pulse">Calling...</p>
      <button onClick={leaveCall} className="mt-12 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
        <span className="material-icons">call_end</span>
      </button>
    </div>
  );
};