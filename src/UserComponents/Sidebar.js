import React, { useEffect, useState } from 'react';
import './Sidebar.css';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaCertificate, FaQuestionCircle, FaUser } from 'react-icons/fa';
import { getDatabase, ref, get } from 'firebase/database';
import Swal from "sweetalert2";

function Sidebar({ isQuestionAnswered, isQuestionGenerated }) {
  const handleSidebarLinkClick = (event) => {
    if (!isQuestionAnswered && isQuestionGenerated) {
      event.preventDefault(); // Prevent navigation
      Swal.fire({
        title: "Warning",
        text: "You cannot navigate away from this page until you answer the questions.",
        icon: "warning",
        confirmButtonText: "Got it"
      });
    }
  };

  const [userName, setUserName] = useState('');
  const [surName, setSurName] = useState('');
  const [branch, setBranch] = useState('');
  const navigate = useNavigate();

  const handleLogout = (event) => {
    if (!isQuestionAnswered && isQuestionGenerated) {
      event.preventDefault(); // Prevent navigation
      Swal.fire({
        title: "Critical Warning",
        text: "You cannot logout until you answer the questions.",
        icon: "error",
        confirmButtonText: "Got it"
      });
    }else{
      document.cookie = "userSessionCred=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";   
    navigate("/");
    }
  };

  // Function to get cookie value by name
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const cookieValue = getCookie('userSessionCred');
      if (cookieValue) {
        try {
          const db = getDatabase();
          const userRef = ref(db, `/user/${cookieValue}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserName(userData.Name || '');
            setSurName(userData.Surname || '');
            setBranch(userData.Branch || '');
          } else {
            console.error('No data available for the user.');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        console.warn("User session not found in cookies.");
      }
    };

    fetchUserData();
  }, []); // Empty array ensures this runs once on mount

  return (
    <div className="sidebar">
      <div className="profile">
        <img
          src="https://www.gravatar.com/avatar/0c7e6d76754563b76c56afdff6327d79?d=robohash"
          alt="Profile"
          className="profile-img"
        />
        <h3>{userName || 'Loading...'} {surName || ''}</h3>
        <p>{branch || 'Loading...'}</p>
      </div>
      <nav>
        <Link to="/Dashboard" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaHome className="nav-icon" />
          <span>Dashboard</span>
        </Link>
        <Link to="/exams" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaCertificate className="nav-icon" />
          <span>Exams</span>
        </Link>
        <Link to="/Courses" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaQuestionCircle className="nav-icon" />
          <span>Courses</span>
        </Link>
        <Link to="/paths" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaUser className="nav-icon" />
          <span>Paths</span>
        </Link>
      </nav>
      <div className="logout-btn" onClick={handleLogout}>
        <p>Logout</p>
      </div>
    </div>
  );   
}

export default Sidebar;
