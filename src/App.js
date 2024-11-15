import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, database } from "../src/Admin/firebase";
import Swal from "sweetalert2";
import Cookies from "js-cookie";
import "./App.css";
import { Link } from 'react-router-dom';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in using cookies
    const userSession = Cookies.get('userSessionCred');
    if (userSession) {
      navigate('/Dashboard'); // Redirect to Dashboard if cookie exists
    }
  }, [navigate]);

  const handleLogin = () => {
    const authInstance = getAuth();

    // Firebase sign-in attempt
    signInWithEmailAndPassword(authInstance, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const userId = user.uid;

        // Check if the user exists in Firebase Realtime Database
        const adminRef = ref(database, `user/${userId}`);
        get(adminRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.val();
              if (userData) {
                // Set cookie based on Remember Me checkbox
                if (rememberMe) {
                  // Store a cookie that expires in 1 year
                  Cookies.set('userSessionCred', userId, { expires: 365, secure: true, sameSite: 'Strict' });
                } else {
                  // Store a session cookie (expires when the browser is closed)
                  Cookies.set('userSessionCred', userId, { expires: 1, secure: true, sameSite: 'Strict' });
                }

                // Redirect to Dashboard
                navigate('/Dashboard');
              }
            } else {
              showAlertMessage("Account not found", "error");
            }
          })
          .catch((error) => {
            console.error("Error retrieving data:", error);
            showAlertMessage("Error retrieving data from Firebase", "error");
          });
      })
      .catch((error) => {
        console.error("Login failed:", error);
        showAlertMessage("Invalid credentials.", "error");
      });
  };

  const handleForgotPassword = () => {
    if (email === '') {
      showAlertMessage("Please enter your email address first.", "warning");
      return;
    }

    const authInstance = getAuth();
    sendPasswordResetEmail(authInstance, email)
      .then(() => {
        showAlertMessage("Password reset email sent! Check your inbox.", "success");
      })
      .catch((error) => {
        let errorMessage = "An error occurred. Please try again later.";
        if (error.code === "auth/user-not-found") {
          errorMessage = "No account found with this email address.";
        }
        showAlertMessage(errorMessage, "error");
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
    <div className="login_page_cover">
      <div className="login-container">
        <div className="logo-container">
          <img
            src="https://account.hackthebox.com/images/logos/logo-htb.svg"
            alt="Logo"
            className="logo"
          />
          <h2>Login to your Account</h2>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
        <div className="options-container">
          <div className="checkbox-container">
            <input
              id="rememberme"
              type="checkbox"
              className="checkbox-input"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <label htmlFor="rememberme" className="RememberMeLabel">
              Remember me
            </label>
          </div>
          <a
            href="#"
            className="forgot-password"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </a>
        </div>
        <button onClick={handleLogin} className="login-button">Login</button>
        <div className="Signup">
          <p>Don't Have an Account?</p>
          <Link to="/signin" className="create-account-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default App;
