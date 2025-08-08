// packages/app/src/components/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideMenu from './SideMenu';

export default function MainLayout() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const handleToggleMenu = () => {
    setIsMenuCollapsed(!isMenuCollapsed);
  };

  return (
    <div className="app-layout">
      <SideMenu isCollapsed={isMenuCollapsed} onToggle={handleToggleMenu} />
      <main className="main-content">
        {/* Сюда react-router будет рендерить дочерние роуты (HomePage, SettingsPage) */}
        <Outlet />
      </main>
    </div>
  );
}