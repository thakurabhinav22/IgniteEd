import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "./firebase";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const userId = Cookies.get("userSessionCred");

    if (!userId) {
      // No cookie, redirect to login
      navigate("/Admin");
      return;
    }

    const adminRef = ref(database, `admin/${userId}`);
    get(adminRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.isAdmin) {
            // Admin access granted
            // alert("Welcome");
          } else {
            // Not an admin, show session expired alert and logout
            showSessionExpiredMessage("Something Went Wrong. Please Login Again");
          }
        } else {
          // User data not found, show session expired alert and logout
          showSessionExpiredMessage("User data not found.");
        }
      })
      .catch((error) => {
        console.error("Error checking admin access:", error);
        showSessionExpiredMessage("An error occurred while checking your status.");
      });
  }, [navigate]);

  const showSessionExpiredMessage = (errorMessage) => {
    Swal.fire({
      title: "Error",
      text: errorMessage || "Your session has expired due to some reason. Please log in again.",
      icon: "error",
      showConfirmButton: true,
      timer: 5000, // Alert will close after 5 seconds
    }).then(() => {
      // Clear cookie and redirect to login after the alert
      Cookies.remove("userSessionCred");
      navigate("/Admin");
    });
  };

  return (
    <div>
      <h1>Welcome to the Admin Dashboard</h1>
      {/* Dashboard content goes here */}
    </div>
  );
}

export default Dashboard;
