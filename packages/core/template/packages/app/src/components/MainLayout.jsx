// packages/app/src/components/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideMenu from './SideMenu';
import TitleBar from './TitleBar';
import styles from './MainLayout.module.css'; // Этот путь теперь верный!
import { useAppConfig } from '../context/ThemeContext';

export default function MainLayout() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const { appTitle } = useAppConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <TitleBar title={appTitle} />
      <div className={styles.appLayout}>
        <SideMenu
          isCollapsed={isMenuCollapsed}
          onToggle={() => setIsMenuCollapsed(!isMenuCollapsed)}
        />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}