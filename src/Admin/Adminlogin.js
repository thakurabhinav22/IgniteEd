import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, database } from "./firebase";
import Swal from "sweetalert2";  
import './AdminLogin.css';
import logo from "../icons/learn.png";

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Set the page title
    document.title = "IgnitEd - Admin Login";

    // Check for cookie and validate admin status
    const userId = Cookies.get('userSessionCredAd');
    if (userId) {
      const adminRef = ref(database, `admin/${userId}`);
      get(adminRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData?.isAdmin) {
              navigate('/Admin/Dashboard'); // Redirect to dashboard if admin
            } else {
              navigate('/Admin'); // Redirect to login if not admin
            }
          } else {
            Cookies.remove('userSessionCredAd'); // Remove invalid cookie
            navigate('/Admin');
          }
        })
        .catch((error) => {
          console.error('Error verifying admin status:', error);
          Cookies.remove('userSessionCredAd'); // Remove cookie on error
          navigate('/Admin');
        });
    }
  }, [navigate]);

  const handleLogin = () => {
    const authInstance = getAuth();

    signInWithEmailAndPassword(authInstance, username, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const userId = user.uid;

        const adminRef = ref(database, `admin/`);
        get(adminRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              const allAdminData = snapshot.val();
              const userData = allAdminData[userId];

              if (userData?.isAdmin) {
                Cookies.set('userSessionCredAd', userId, { secure: true, sameSite: 'Strict' });
                navigate('/Admin/Dashboard');
              } else {
                showAlertMessage("Access denied: Admins only", "error");
              }
            } else {
              showAlertMessage("Error: No admin data found.", "error");
            }
          })
          .catch(() => {
            showAlertMessage("Error retrieving data from Firebase", "error");
          });
      })
      .catch((error) => {
        showAlertMessage(
          error.code === 'auth/invalid-credential'
            ? 'Invalid Credential'
            : 'An error occurred during login',
          "error"
        );
      });
  };

  const showAlertMessage = (message, type) => {
    Swal.fire({
      title: message,
      icon: type,
      position: 'top',
      toast: true,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    });
  };

  return (
    <div className="Admin-login-component-holder">
      <div className="login-container">
        <div className="logo-container">
          <img src={logo} alt="Logo" className="logo" style={{ width: "150px" }} />
          <h2>Login As Administrator</h2>
        </div>
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input-field"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
        <button onClick={handleLogin} className="login-button">
          Login
        </button>
      </div>
    </div>
  );
}

export default AdminLogin;