import React from 'react';
import { useCall } from '../../context/CallContext';

export const IncomingCallModal = () => {
  // بنسحب الداتا والدوال اللي محتاجينها من السنترال بتاعنا
  const { receivingCall, callAccepted, callerName, answerCall, leaveCall } = useCall();

  // لو مفيش رنة جاية، أو المكالمة تم الرد عليها خلاص، متظهرش حاجة (الكومبوننت يختفي)
  if (!receivingCall || callAccepted) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* النافذة نفسها */}
      <div className="bg-white dark:bg-[#262626] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-300">
        
        {/* معلومات المتصل وتأثير الرنة */}
        <div className="p-8 flex flex-col items-center text-center mt-4">
          <div className="relative mb-6">
            {/* الدايرة البنفسجي اللي بتنبض */}
            <div className="absolute inset-0 bg-[#7C3AED] rounded-full animate-ping opacity-60"></div>
            
            {/* صورة المتصل */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCW6ItkwKUr4KlBQ51P-gCFRC6MxWH41ny06iQ2LtV9FoQRsSo-pKrce9CPwQrQiivOzrMecOrLybR1kH-xp40FVxZ9CrusaE6oJZq37YUIoDFgUGIrlyA0DeQWOCUXHyWkiWDT2Iag-9WcyTkL6__d64juO7NigKCiN0n8UoJoEqC-dd7-IUigCxsfMGAI7emL13gJeCGVk28QzFR6sRIEQbzgmWk77vTh06zwkU5KBZf8sA5y4L8czqcwPE1-fCMGC-X5VQ6kfTMV" 
              alt={callerName}
              className="w-28 h-28 rounded-full object-cover relative z-10 border-4 border-white dark:border-[#262626] shadow-lg"
            />
          </div>
          
          <h3 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2">
            {callerName || 'مستخدم غير معروف'}
          </h3>
          <p className="text-[#7C3AED] dark:text-[#8B5CF6] font-medium flex items-center gap-2">
            <span className="material-icons-round animate-bounce text-sm">videocam</span>
            Incoming Video Call...
          </p>
        </div>

        {/* زراير الرد والرفض */}
        <div className="flex bg-gray-50 dark:bg-[#171717] p-6 gap-8 justify-center border-t border-gray-100 dark:border-gray-800">
          
          {/* زرار الرفض (أحمر) */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={leaveCall}
              className="flex items-center justify-center w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"
              title="Decline"
            >
              <span className="material-icons-round text-2xl">call_end</span>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Decline</span>
          </div>

          {/* زرار الرد (أخضر) */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={answerCall}
              className="flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 animate-pulse"
              title="Accept"
            >
              <span className="material-icons-round text-2xl">call</span>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Accept</span>
          </div>

        </div>
      </div>
    </div>
  );
};