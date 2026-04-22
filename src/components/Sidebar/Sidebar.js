import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const utcDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const utcTimeFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const Sidebar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    {
      title: 'Data View',
      path: '/data',
      icon: '📊',
      description: 'View statistics and analytics'
    },
    {
      title: 'Earth View',
      path: '/earth',
      icon: '🌍',
      description: 'Global infrastructure map'
    },
    {
      title: 'Member View',
      path: '/members',
      icon: '👥',
      description: 'Member information and stats'
    },
    {
      title: 'Service View',
      path: '/services',
      icon: '⚡',
      description: 'Service catalog and details'
    },
    {
      title: 'Billing View',
      path: '/billing',
      icon: '💰',
      description: 'Billing management and PDFs'
    }
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button className={`mobile-menu-toggle ${isOpen ? 'hidden' : ''}`} onClick={toggleSidebar}>
        <span className="menu-icon">☰</span>
      </button>
      
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/static/imgs/ibp.png" alt="IBP" className="logo" />
            <h1 className="logo-text">Dashboard</h1>
          </div>
          {window.innerWidth <= 768 && (
            <button className="mobile-close-btn" onClick={closeSidebar}>
              ×
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-content">
                <span className="nav-title">{item.title}</span>
                <span className="nav-description">{item.description}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="time-display">
            <div className="date">{utcDateFormatter.format(currentTime)}</div>
            <div className="time">{utcTimeFormatter.format(currentTime)} UTC</div>
          </div>
          <div className="version">
            <small>IBP GeoDNS v0.4.0</small>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;