// src/components/layout/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import { ChatProvider } from "../../context/ChatContext";
import { CallProvider } from "../../context/CallContext";
import { IncomingCallModal } from "../call/IncomingCallModal";
import { OutgoingCallModal } from "../call/OutgoingCallModal";
import { VideoCallRoom } from "../call/VideoCallRoom";

// TODO (Aya): If we add a Mobile view with open/close toggle, the toggle state will be managed in Redux here
// خطة: اعمل uiSlice فيه sidebarOpen state، واستخدمه بـ useSelector للتحكم في عرض الـ sidebar على الـ mobile
export const MainLayout = () => {
  return (
    <ChatProvider>
      <CallProvider>
        <div className="bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] font-display h-screen flex overflow-hidden transition-colors duration-300">
          {/* 1. العمود الأول: السايد بار (ثابت) */}
          <LeftSidebar />

          {/* 2. باقي الشاشة: هنا هيتعرض محتوى الصفحات (زي الـ Chats List ومربع المحادثة) */}
          <main className="flex-1 overflow-y-auto relative min-h-0 min-w-0 transition-colors duration-300">
            <Outlet />
          </main>
        </div>
        
        {/* Global Call UI Components */}
        <IncomingCallModal />
        <OutgoingCallModal />
        <VideoCallRoom />
      </CallProvider>
    </ChatProvider>
  );
};

