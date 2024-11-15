import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import Sidebar from './Sidebar';
// import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if userSessionCred cookie exists
    const userSession = Cookies.get('userSessionCred');
    if (!userSession) {
      // If no session cookie, redirect to login page
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <h1>Dashboard</h1>
        {/* Additional dashboard components can be added here */}
      </div>
    </div>
  );
}

export default Dashboard;
