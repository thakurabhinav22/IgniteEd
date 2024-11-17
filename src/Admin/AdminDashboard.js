import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "./firebase";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import "./AdminDashboard.css"
import AdminSidebar from "./adminSideBar";

function AdminDashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  useEffect(() => {
    document.title = "TheLearnMax - Admin Dashboard";
    const userId = Cookies.get("userSessionCredAd");

    if (!userId) {
      navigate("/Admin");
      return;
    }

    const adminRef = ref(database, `admin/${userId}`);
    get(adminRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.isAdmin) {
            setAdminName(userData.Name || "Admin");
            setAdminRole(userData.Role || "Administrator");
          } else {
            showSessionExpiredMessage("Something Went Wrong. Please Login Again");
          }
        } else {
          showSessionExpiredMessage("Invalid Admin Session.");
        }
      })
      .catch((error) => {
        console.error("Error checking admin access:", error);
        showSessionExpiredMessage("An error occurred while checking your status.");
      });
  }, [navigate]);

  const showSessionExpiredMessage = (errorMessage) => {
    Swal.fire({
      title: errorMessage,
      icon: "error",
      position: 'top',
      toast: true,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    }).then(() => {
      Cookies.remove("userSessionCredAd");
      navigate("/Admin");
    });
  };

  return (
    <div className="Admin-page-cover">
      <AdminSidebar AdminName={adminName} Role={adminRole} />
    </div>
  );
}

export default AdminDashboard;
