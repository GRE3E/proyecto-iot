"use client";
import { AuthProvider } from "./hooks/useAuth";
import AppContent from "./AppContent";

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
