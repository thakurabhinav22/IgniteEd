import React from 'react';
import './Sidebar.css';
import { Link } from 'react-router-dom';
import { FaHome, FaCertificate, FaQuestionCircle, FaUser } from 'react-icons/fa';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="profile">
        <img src="https://www.gravatar.com/avatar/0c7e6d76754563b76c56afdff6327d79?d=robohash" alt="Profile" className="profile-img" />
        <h3>iamnotspidey</h3>
        <p>Free Plan</p>
      </div>
      <nav>
        <Link to="/Dashboard" className="nav-item">
          <FaHome className="nav-icon" />
          <span>Dashboard</span>
        </Link>
        <Link to="/exams" className="nav-item">
          <FaCertificate className="nav-icon" />
          <span>Exams</span>
        </Link>
        <Link to="/modules" className="nav-item">
          <FaQuestionCircle className="nav-icon" />
          <span>Modules</span>
        </Link>
        <Link to="/paths" className="nav-item">
          <FaUser className="nav-icon" />
          <span>Paths</span>
        </Link>
        {/* Add more navigation items here */}
      </nav>
      <div className="dark-mode">
        <p>Subscribe now!</p>
      </div>
    </div>
  );
}

export default Sidebar;
