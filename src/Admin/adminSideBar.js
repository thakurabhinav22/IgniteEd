import React from "react";
import "boxicons"; 
import "./AdminSidebar.css";
import { Link, Navigate } from "react-router-dom";
import { FaHome} from "react-icons/fa";
import { useNavigate } from "react-router-dom"; 
import crawler from '../icons/web.png'


function AdminSidebar({ AdminName, Role }) {
  const navigate = useNavigate();
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
        <h3>{AdminName || "Loading..."}</h3>
        <p>{Role || "Loading..."}</p>
      </div>
      <nav>
        <Link to="/Admin/Dashboard" className="nav-item">
        <box-icon type='solid' color="white" name='home'></box-icon>
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
        <Link to="#" className="nav-item">
          <img src={crawler} alt="Crawler" name="book-bookmark" style={{ width: "30px" }} className="nav-icon" />
          <span>Crawler Spider</span>
        </Link>
        <Link to="#" className="nav-item">
          <box-icon type="solid" name="user-plus" color="white" className="nav-icon" />
          <span>Add Team</span>
        </Link>
        <Link to="#" className="nav-item">
          <box-icon type="solid" name="bell-plus" color="white" className="nav-icon" />
          <span>Create Announcement</span>
        </Link>
      </nav>
      <div className="logout" onClick={handleLogout}>
        <p>Logout</p>
      </div>
    </div>
  );
}

export default AdminSidebar;
