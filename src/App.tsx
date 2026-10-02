import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { UserSwitchModal } from './components/UserSwitchModal';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { InventoryView } from './views/InventoryView';
import { UnitConverterView } from './views/UnitConverterView';
import { CustomersDebtView } from './views/CustomersDebtView';
import { SuppliersPurchasesView } from './views/SuppliersPurchasesView';
import { StockManagementView } from './views/StockManagementView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { MasterDataView } from './views/MasterDataView';
import { LoginView } from './views/LoginView';

const MainLayout: React.FC = () => {
  const { isAuthenticated } = useApp();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState<boolean>(false);
  const [isUnitConverterModalOpen, setIsUnitConverterModalOpen] = useState<boolean>(false);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'pos':
        return <PosView />;
      case 'master-data':
        return <MasterDataView />;
      case 'materials':
        return <InventoryView />;
      case 'converter':
        return <UnitConverterView />;
      case 'customers':
        return <CustomersDebtView />;
      case 'suppliers':
        return <SuppliersPurchasesView />;
      case 'stock':
        return <StockManagementView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
      case 'users':
        return <SettingsView />;
      default:
        return <DashboardView onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-row font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <Header
          onOpenConverter={() => setCurrentTab('converter')}
          onOpenUserSwitch={() => setIsUserSwitchOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* View Body */}
        <main className="flex-1 pb-16">
          {renderActiveView()}
        </main>
      </div>

      {/* Switch User PIN Auth Modal */}
      {isUserSwitchOpen && (
        <UserSwitchModal onClose={() => setIsUserSwitchOpen(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
