import { useState } from "react";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import OverviewSection from "@/components/Sections/OverviewSection";
import ConsultantsSection from "@/components/Sections/ConsultantsSection";
import NotificationsSection from "@/components/Sections/NotificationsSection";
import DocumentsSection from "@/components/Sections/DocumentsSection";
import AnalysisSection from "@/components/Sections/AnalysisSection";
import ReadySection from "@/components/Sections/ReadySection";
import CalendarSection from "@/components/Sections/CalendarSection";
import SettingsSection from "@/components/Sections/SettingsSection";

const Index = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "consultants":
        return <ConsultantsSection />;
      case "notifications":
        return <NotificationsSection />;
      case "documents":
        return <DocumentsSection />;
      case "analysis":
        return <AnalysisSection />;
      case "ready":
        return <ReadySection />;
      case "calendar":
        return <CalendarSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        <main className="flex-1 p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
};

export default Index;
