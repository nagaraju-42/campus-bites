import type { Metadata } from "next";

import { Toaster } from "react-hot-toast";
import "./globals.css";
import MaintenanceGuard from "@/components/shared/MaintenanceGuard";
import PresenceTracker from "@/components/shared/PresenceTracker";

// Removed Geist font imports

export const metadata: Metadata = {
  title: "DineNDeliver",
  description: "Food delivery for campus students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <MaintenanceGuard>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <PresenceTracker />
          {children}
        </MaintenanceGuard>
      </body>
    </html>
  );
}
