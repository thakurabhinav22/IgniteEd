import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../Admin/firebase";
import Swal from "sweetalert2";

import "./signinform.css";

function SignUpForm() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const navigate = useNavigate();

  const handleSignup = () => {
    // Firebase create user with email and password
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Store additional user information in Firebase Realtime Database
        const userId = user.uid; // Firebase Auth User ID
        const userRef = ref(database, `user/${userId}`);

        set(userRef, {
          isAdmin: false,
          email: user.email,
          Name: name,
          Surname: surname,
          College: college,
          Branch: branch,
        })
          .then(() => {
            Swal.fire({
              title: "Sign up successful!",
              icon: "success",
              position: "top",
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
            navigate("/Dashboard");
          })
          .catch((error) => {
            console.error("Error saving user data:", error);
            Swal.fire({
              title: "Error saving data",
              icon: "error",
              position: "top",
              toast: true,
              showConfirmButton: false,
              timer: 3000,
            });
          });
      })
      .catch((error) => {
        let errorMessage = "An error occurred. Please try again later.";
        
        if (error.code === "auth/email-already-in-use") {
          errorMessage = "User already Exist";
        }

        Swal.fire({
          title: errorMessage,
          icon: "error",
          position: "top",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
      });
  };

  return (
    <div className="signup-form-page">
      <div className="signup-container">
        <div className="logo-container">
          <img
            src="https://account.hackthebox.com/images/logos/logo-htb.svg"
            alt="Logo"
            className="logo"
          />
          <h2>Create your Account</h2>
        </div>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Surname"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          className="input-field"
        />
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
        <input
          type="text"
          placeholder="College"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="input-field"
        />
        <button onClick={handleSignup} className="signup-button">
          Sign Up
        </button>
        <div className="Login">
          <p>Already have an account?</p>
          <a href="/" className="login-link">Login</a>
        </div>
      </div>
    </div>
  );
}

export default SignUpForm;
