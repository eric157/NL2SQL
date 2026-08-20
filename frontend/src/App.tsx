import { useState } from 'react';
import { Navbar } from './components/Navbar';
import type { NavTab } from './components/Navbar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AIAnalystView } from './components/AIAnalystView';
import { DataModelView } from './components/DataModelView';
import { RootCauseView } from './components/RootCauseView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { QueryHistoryView } from './components/QueryHistoryView';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [targetQuestion, setTargetQuestion] = useState<string>('');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  const handleAskAIFromDashboard = (question: string) => {
    setTargetQuestion(question);
    setActiveTab('analyst');
  };

  const handleResetSession = () => {
    setTargetQuestion('');
    setActiveTab('dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onReset={handleResetSession} 
        isDevMode={isDevMode}
        setIsDevMode={setIsDevMode}
      />
      
      <main style={{ paddingBottom: '3rem' }}>
        {activeTab === 'dashboard' && <ExecutiveDashboard onAskAI={handleAskAIFromDashboard} />}
        {activeTab === 'analyst' && <AIAnalystView initialQuestion={targetQuestion} isDevMode={isDevMode} />}
        {activeTab === 'rootcause' && <RootCauseView />}
        {activeTab === 'datamodel' && <DataModelView />}
        {activeTab === 'security' && <SecurityAuditView />}
        {activeTab === 'history' && <QueryHistoryView />}
      </main>
    </div>
  );
}

export default App;
