import React from "react";
import "./AdminSidebar.css";
import { Link } from "react-router-dom";
import { FaHome, FaCertificate, FaQuestionCircle, FaUser } from "react-icons/fa";

function AdminSidebar({ AdminName, Role }) {
  return (
    <div className="sidebar">
      <div className="profile">
        <img
          src="https://thumbs.dreamstime.com/b/admin-user-icon-account-has-virtually-unlimited-access-to-all-programs-isolated-background-vector-illustration-322126763.jpg"
          alt="Profile"
          className="profile-img"
        />
        <h3>{AdminName || "Loading..."}</h3>
        <p>{"Role: "+Role || "Loading..."}</p>
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
      </nav>
      <div className="dark-mode">
        <p>Logout</p>
      </div>
    </div>
  );
}

export default AdminSidebar;
