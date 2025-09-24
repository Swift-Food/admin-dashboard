import { useState } from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import Sidebar from './components/Sidebar';
import type { SidebarPage } from './components/Sidebar';
import HomeScreen from './pages/HomeScreen';
import DriverStatusScreen from './pages/DriverStatusScreen';
import MapScreen from './pages/MapScreen';
import StatisticsScreen from './pages/StatisticsScreen';

function App() {
  const [currentPage, setCurrentPage] = useState<SidebarPage>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomeScreen />;
      case 'driver-status':
        return <DriverStatusScreen />;
      case 'statistics':
        return <StatisticsScreen />;
      case 'map':
        return <MapScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
