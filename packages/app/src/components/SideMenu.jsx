// packages/app/src/components/SideMenu.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SideMenu({ isCollapsed, onToggle }) {
  return (
    <aside className={`side-menu ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="menu-toggle">
        <button onClick={onToggle} title="Toggle menu">
          {isCollapsed ? '>>' : '<<'}
        </button>
      </div>
      <nav>
        <ul>
          <li>
            <NavLink to="/">
              <span>🏠</span>
              <span className="menu-item-text">Главная</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings">
              <span>⚙️</span>
              <span className="menu-item-text">Настройки</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}