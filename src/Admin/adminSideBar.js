import React, { useEffect, useState } from "react";
import "boxicons"; 
import "./AdminSidebar.css";
import { Link, useNavigate } from "react-router-dom";
import { get, ref } from "firebase/database";
import { database } from "./firebase"; // Use 'database' instead of 'db'
import crawler from '../icons/web.png';
import magicWritter from '../icons/MagicWritter.png';

// Function to get cookie value by name
const getCookie = (name) => {
  const cookies = document.cookie.split("; ");
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=");
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
    // if (cookieName === null ||)
  }
  return null;
};

function AdminSidebar() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Loading...");
  const [role, setRole] = useState("Loading...");

  useEffect(() => {
    const userID = getCookie("userSessionCredAd"); // Assuming cookie contains user ID

    if (userID) {
      const userRef = ref(database, `admin/${userID}`); // Fetch admin details from Firebase
      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setAdminName(userData.Name || "Admin");
            setRole(userData.Role || "Unknown Role");
          } else {
            console.warn("Admin data not found.");
            setAdminName("Admin");
            setRole("Unknown Role");
          }
        })
        .catch((error) => console.error("Error fetching admin data:", error));
    }
  }, []);

  const handleLogout = () => {
    document.cookie = "userSessionCredAd=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    navigate("/Admin/");
  };

  return (
    <div className="sidebar">
      <div className="profile">
        <img
          src="https://thumbs.dreamstime.com/b/admin-user-icon-account-has-virtually-unlimited-access-to-all-programs-isolated-background-vector-illustration-322126763.jpg"
          alt="Profile"
          className="profile-img"
        />
        <h3>{adminName}</h3>
        <p>{role}</p>
      </div>
      <nav>
        <Link to="/Admin/Dashboard" className="nav-item">
          <box-icon type="solid" color="white" name="home"></box-icon>
          <span>Dashboard</span>
        </Link>
        <Link to="/Admin/CreateCourse" className="nav-item">
          <box-icon type="solid" name="file-plus" color="white" className="nav-icon" />
          <span>Create Course</span>
        </Link>
        <Link to="/Admin/ManageRepo" className="nav-item">
          <box-icon type="solid" name="data" color="white" className="nav-icon" />
          <span>Manage Course DB</span>
        </Link>
        <Link to="/Admin/webcrawler" className="nav-item">
          <img src={crawler} alt="Crawler" style={{ width: "30px" }} className="nav-icon" />
          <span>Crawler Spider</span>
        </Link>
        <Link to="/Admin/MagicWritter" className="nav-item">
          <img src={magicWritter} alt="Magic Writter" style={{ width: "25px" }} className="nav-icon" />
          <span>Magic Writter</span>
        </Link>
      </nav>
      <div className="logout" onClick={handleLogout}>
        <p>Logout</p>
      </div>
    </div>
  );
}

export default AdminSidebar;
