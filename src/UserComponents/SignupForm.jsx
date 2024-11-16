import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "../Admin/firebase";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import "./signinform.css";

function SignUpForm() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [otherBranch, setOtherBranch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = () => {
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedCollege = college.trim();
    const selectedBranch = branch === "Other" ? otherBranch.trim() : branch;


    if (!trimmedName || !trimmedSurname || !trimmedEmail || !trimmedPassword) {
      Swal.fire({
        title: "Please fill in all required fields",
        icon: "warning",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    if (selectedBranch == '') {
      Swal.fire({
        title: "Please select Branch",
        icon: "warning",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    // Validate password length and match
    if (trimmedPassword.length < 7) {
      Swal.fire({
        title: "Password must be at least 7 characters long",
        icon: "warning",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    if (trimmedPassword !== trimmedConfirmPassword) {
      Swal.fire({
        title: "Passwords do not match",
        icon: "error",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    // Proceed with Firebase signup
    createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
      .then((userCredential) => {
        const user = userCredential.user;

        const userId = user.uid; 
        const userRef = ref(database, `user/${userId}`);

        set(userRef, {
          isAdmin: false,
          email: user.email,
          Name: trimmedName,
          Surname: trimmedSurname,
          College: trimmedCollege,
          Branch: selectedBranch,
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
            navigate("/");
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
          errorMessage = "User already exists";
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
          placeholder="Name*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Surname*"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          className="input-field"
        />
        <input
          type="email"
          placeholder="Email*"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
        />
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password*"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password*"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
          />
          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />
            <p className="showpasswordText">Show Password</p>
          </label>
        </div>
        <input
          type="text"
          placeholder="College (optional)"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          className="input-field"
        />
        <div className="optionDiv">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="input-field"
          >
            <option value="">Select Branch</option>
            <option value="Computer Science">Computer Engineering</option>
            <option value="Mechanical Engineering">Mechanical</option>
            <option value="Electrical Engineering">Electrical</option>
            <option value="Other">Other</option>
          </select>
          {branch === "Other" && (
            <input
              type="text"
              placeholder="Specify Branch"
              value={otherBranch}
              onChange={(e) => setOtherBranch(e.target.value)}
              className="input-field"
            />
          )}
        </div>
        <button onClick={handleSignup} className="signup-button">
          Sign Up
        </button>
        <div className="Login">
          <p>Already have an account?</p>
          <Link to="/" className="login-link">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignUpForm;
