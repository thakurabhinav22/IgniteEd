import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, database } from "../src/Admin/firebase";
import Swal from "sweetalert2";
import Cookies from "js-cookie";
import "./App.css";
import { Link } from "react-router-dom";
import logo from "../src/icons/logo.png";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "LearnMax - Login";
    const userSession = Cookies.get("userSessionCred");
    if (userSession) {
      navigate("/Dashboard");
    }
  }, [navigate]);

  const handleLogin = () => {
    const authInstance = getAuth();

    signInWithEmailAndPassword(authInstance, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        const userId = user.uid;

        const adminRef = ref(database, `user/${userId}`);
        get(adminRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.val();
              if (userData) {
                if (rememberMe) {
                  Cookies.set("userSessionCred", userId, {
                    expires: 365,
                    secure: true,
                    sameSite: "Strict",
                  });
                } else {
                  Cookies.set("userSessionCred", userId, {
                    secure: true,
                    sameSite: "Strict",
                  });
                }
                navigate("/Dashboard");
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
        let errorMessage = "Invalid credentials.";

        // Check for specific Firebase error codes
        if (error.code === "auth/user-disabled") {
          errorMessage = "User banned from using this product.";
        } else if (error.code === "auth/user-not-found") {
          errorMessage = "No account found with this email.";
        } else if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        }

        console.error("Login failed:", error);
        showAlertMessage(errorMessage, "error");
      });
  };

  const handleForgotPassword = () => {
    if (email === "") {
      showAlertMessage("Please enter your email address first.", "warning");
      return;
    }

    const authInstance = getAuth();
    sendPasswordResetEmail(authInstance, email)
      .then(() => {
        showAlertMessage(
          "Password reset email sent! Check your inbox.",
          "success"
        );
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
      position: "top",
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
            src={logo}
            alt="Logo"
            className="logo"
            style={{ width: "150px" }}
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
        <button onClick={handleLogin} className="login-button">
          Login
        </button>
        <div className="Signup">
          <p>Don't Have an Account?</p>
          <Link to="/signin" className="create-account-link">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

export default App;
