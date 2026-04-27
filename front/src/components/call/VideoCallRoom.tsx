import React, { useState } from 'react';
import { useCall } from '../../context/CallContext';

export const VideoCallRoom = () => {
  // بنسحب الفيديوهات وحالة المكالمة من السنترال
  const { callAccepted, callEnded, myVideo, userVideo, leaveCall, stream } = useCall();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // لو المكالمة لسه متقبلتش أو خلصت خلاص، متظهرش الغرفة
  if (!callAccepted || callEnded) return null;

  // دالة كتم المايك
  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // دالة قفل الكاميرا
  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#171717] flex flex-col animate-in fade-in duration-300">
      
      {/* منطقة عرض الفيديوهات */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center">
        
        {/* فيديو الطرف التاني (كبير في الخلفية) */}
        {callAccepted && !callEnded && (
          <video
            playsInline
            ref={userVideo}
            autoPlay
            className="w-full h-full object-cover"
          />
        )}

        {/* فيديو بتاعك إنت (صغير عايم في الجنب PiP) */}
        {stream && (
          <div className="absolute top-6 right-6 w-48 h-64 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-10 transition-all hover:scale-105">
            <video
              playsInline
              muted // لازم ده يكون Muted عشان متسمعش صدى صوتك
              ref={myVideo}
              autoPlay
              className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'}`}
            />
            {/* بديل لو قفلت الكاميرا */}
            {isCameraOff && (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                <span className="material-icons-round text-4xl">videocam_off</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* شريط التحكم السفلي */}
      <div className="h-24 bg-[#262626] border-t border-gray-800 flex items-center justify-center gap-6 px-6 shrink-0">
        
        {/* زرار المايك */}
        <button 
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
        >
          <span className="material-icons-round text-2xl">{isMuted ? 'mic_off' : 'mic'}</span>
        </button>

        {/* زرار قفل الخط (أحمر) */}
        <button 
          onClick={leaveCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        >
          <span className="material-icons-round text-3xl">call_end</span>
        </button>

        {/* زرار الكاميرا */}
        <button 
          onClick={toggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isCameraOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
        >
          <span className="material-icons-round text-2xl">{isCameraOff ? 'videocam_off' : 'videocam'}</span>
        </button>

      </div>
    </div>
  );
};