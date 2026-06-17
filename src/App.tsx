import { useSentinelStore } from './store';
import Header from './components/Header';
import SideNav from './components/SideNav';
import KPIStrip from './components/KPIStrip';
import HotspotMap from './components/tabs/HotspotMap';
import PatrolPlan from './components/tabs/PatrolPlan';
import ImpactAnalysis from './components/tabs/ImpactAnalysis';
import Explore from './components/tabs/Explore';
import NotificationsPanel from './components/NotificationsPanel';
import SupportModal from './components/SupportModal';

export default function App() {
  const { activeTab } = useSentinelStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden ml-[282px] mt-16">
          <KPIStrip />
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'hotspot' && <HotspotMap />}
            {activeTab === 'patrol' && <PatrolPlan />}
            {activeTab === 'impact' && <ImpactAnalysis />}
            {activeTab === 'explore' && <Explore />}
          </div>
        </main>
      </div>
      <NotificationsPanel />
      <SupportModal />
    </div>
  );
}
