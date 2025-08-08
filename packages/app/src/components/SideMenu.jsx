// packages/app/src/components/SideMenu.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './SideMenu.module.css'; // Этот путь теперь верный!

export default function SideMenu({ isCollapsed, onToggle }) {
  const asideClasses = `${styles.sideMenu} ${isCollapsed ? styles.collapsed : ''}`;

  return (
    <aside className={asideClasses}>
      <div className={styles.menuToggle}>
        <button onClick={onToggle} title="Toggle menu" className={styles.toggleButton}>
          {isCollapsed ? '>>' : '<<'}
        </button>
      </div>
      <nav>
        <ul className={styles.nav}>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              <span>🏠</span>
              <span className={styles.menuItemText}>Главная</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              <span>⚙️</span>
              <span className={styles.menuItemText}>Настройки</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}