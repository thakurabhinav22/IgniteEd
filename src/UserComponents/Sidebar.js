import React, { useEffect, useState, useRef } from "react";
import "./Sidebar.css";
import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaCertificate, FaQuestionCircle, FaCog, FaUser, FaLock, FaTools, FaTimes, FaPlay } from "react-icons/fa";
import { getDatabase, ref, get, update, remove, set } from "firebase/database";
import Swal from "sweetalert2";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

function Sidebar({ isQuestionAnswered, isQuestionGenerated }) {
  const [userName, setUserName] = useState("");
  const [surName, setSurName] = useState("");
  const [branch, setBranch] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedVoiceModel, setSelectedVoiceModel] = useState("microsoft-david");
  const navigate = useNavigate();
  const settingsRef = useRef(null);
  const hasPlayedInitialSample = useRef(false);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };

  const userId = getCookie("userSessionCred");

  // Function to handle logout
  const handleLogout = () => {
    // Clear the userSessionCred cookie by setting it to expire in the past
    document.cookie = "userSessionCred=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    // Optionally, show a success message
    Swal.fire({
      title: "Logged Out",
      text: "You have been successfully logged out.",
      icon: "success",
      confirmButtonColor: "#1E3A8A",
      timer: 1500, // Auto-close after 1.5 seconds
      showConfirmButton: false,
    }).then(() => {
      navigate("/"); // Redirect to root after logout
    });
  };

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }

    const fetchUserData = async () => {
      try {
        const db = getDatabase();
        const userRef = ref(db, `/user/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserName(userData.Name || "");
          setSurName(userData.Surname || "");
          setBranch(userData.Branch || "");
          if (userData.PrefferedAudio) {
            setSelectedVoiceModel(userData.PrefferedAudio);
          }
          document.body.className = "light";
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        stopAudio();
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      stopAudio();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userId, navigate]);

  const handleSidebarLinkClick = (event) => {
    if (!isQuestionAnswered && isQuestionGenerated) {
      event.preventDefault();
      Swal.fire({
        title: "Warning",
        text: "You cannot navigate away from this page until you answer the questions.",
        icon: "warning",
        confirmButtonText: "Got it",
        confirmButtonColor: "#1E3A8A",
      });
    }
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
  };

  const playAudioSample = (voice) => {
    const utterance = new SpeechSynthesisUtterance(
      "hello this audio example for select the audio that you like to appear in your course reading"
    );

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice;

    switch (voice) {
      case "microsoft-david":
        selectedVoice = voices.find((v) => v.name.includes("David") && v.lang === "en-US") || voices.find((v) => v.lang === "en-US") || voices[0];
        break;
      case "microsoft-hazel":
        selectedVoice = voices.find((v) => v.name.includes("Hazel") && v.lang === "en-GB") || voices.find((v) => v.lang === "en-GB") || voices[0];
        break;
      case "microsoft-susan":
        selectedVoice = voices.find((v) => v.name.includes("Susan") && v.lang === "en-GB") || voices.find((v) => v.lang === "en-GB") || voices[0];
        break;
      case "microsoft-heera":
        selectedVoice = voices.find((v) => v.name.includes("Heera") && v.lang === "en-IN") || voices.find((v) => v.lang === "en-IN") || voices[0];
        break;
      case "microsoft-ravi":
        selectedVoice = voices.find((v) => v.name.includes("Ravi") && v.lang === "en-IN") || voices.find((v) => v.lang === "en-IN") || voices[0];
        break;
      case "google-hindi":
        selectedVoice = voices.find((v) => v.lang === "hi-IN") || voices.find((v) => v.lang.includes("hi")) || voices[0];
        break;
      default:
        selectedVoice = voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveAudioPreference = () => {
    const db = getDatabase();
    const audioRef = ref(db, `/user/${userId}/PrefferedAudio`);
    
    set(audioRef, selectedVoiceModel)
      .then(() => {
        Swal.fire({
          title: "Success!",
          text: "Audio preference saved successfully.",
          icon: "success",
          confirmButtonColor: "#1E3A8A",
        });
      })
      .catch((error) => {
        Swal.fire({
          title: "Error",
          text: "Failed to save audio preference: " + error.message,
          icon: "error",
          confirmButtonColor: "#DC2626",
        });
      });
  };

  const updateUserData = (updates) => {
    const db = getDatabase();
    const userRef = ref(db, `/user/${userId}`);
    update(userRef, updates)
      .then(() => {
        if (updates.Name) setUserName(updates.Name);
        if (updates.Surname) setSurName(updates.Surname);
        if (updates.Branch) setBranch(updates.Branch);
        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully.",
          icon: "success",
          confirmButtonColor: "#1E3A8A",
        });
      })
      .catch((error) => {
        Swal.fire({
          title: "Error",
          text: "Failed to update profile: " + error.message,
          icon: "error",
          confirmButtonColor: "#DC2626",
        });
      });
  };

  const handleDeleteAccount = () => {
    Swal.fire({
      title: "Confirm Account Deletion",
      html: `
        <p>Enter your password to confirm account deletion:</p>
        <input type="password" id="swal-password" class="swal2-input user-details-box" placeholder="Password">
      `,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#6B7280",
      preConfirm: () => {
        const password = document.getElementById("swal-password").value;
        if (!password) {
          Swal.showValidationMessage("Password is required!");
          return false;
        }
        return password;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const db = getDatabase();
        const userRef = ref(db, `/user/${userId}`);
        get(userRef).then((snapshot) => {
          if (snapshot.exists() && snapshot.val().Password === result.value) {
            remove(userRef)
              .then(() => {
                document.cookie = "userSessionCred=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
                Swal.fire({
                  title: "Account Deleted",
                  text: "Your account has been successfully deleted.",
                  icon: "success",
                  confirmButtonColor: "#1E3A8A",
                }).then(() => navigate("/"));
              })
              .catch((error) => {
                Swal.fire({
                  title: "Error",
                  text: "Failed to delete account: " + error.message,
                  icon: "error",
                  confirmButtonColor: "#DC2626",
                });
              });
          } else {
            Swal.fire({
              title: "Error",
              text: "Incorrect password!",
              icon: "error",
              confirmButtonColor: "#DC2626",
            });
          }
        });
      }
    });
  };

  const handleViewInfo = () => {
    Swal.fire({
      title: "Your Information",
      html: `
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Surname:</strong> ${surName}</p>
        <p><strong>Branch:</strong> ${branch}</p>
        <p><strong>User ID:</strong> ${userId}</p>
      `,
      icon: "info",
      confirmButtonText: "OK",
      confirmButtonColor: "#1E3A8A",
    });
  };

  const handleDownloadAnalytics = () => {
    const csvContent = `data:text/csv;charset=utf-8,UserID,CoursesCompleted,Progress\n${userId},3,75%`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Swal.fire({
      title: "Download Started",
      text: "Your analytics CSV is downloading.",
      icon: "success",
      confirmButtonColor: "#1E3A8A",
    });
  };

  
  const handleResetPassword = () => {
    const auth = getAuth(); // Get the Firebase Auth instance
    const db = getDatabase(); // Get the Firebase Realtime Database instance
  
    // Retrieve the user ID from the cookie
    const userId = getCookie("userSessionCred");
  
    if (!userId) {
      Swal.fire({
        title: "Error",
        text: "User not logged in. Please log in first.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#DC2626",
      });
      return;
    }

    const userRef = ref(db, `user/${userId}`); 

    get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const userEmail = userData.email; 
  
          if (userEmail) {
            sendPasswordResetEmail(auth, userEmail)
              .then(() => {
                Swal.fire({
                  title: "Reset Password",
                  text: "A password reset link has been sent to your registered email address.",
                  icon: "success",
                  confirmButtonText: "OK",
                  confirmButtonColor: "#1E3A8A",
                });
              })
              .catch((error) => {
                console.error("Error sending password reset email:", error);
                Swal.fire({
                  title: "Error",
                  text: "Failed to send password reset email. Please try again.",
                  icon: "error",
                  confirmButtonText: "OK",
                  confirmButtonColor: "#DC2626",
                });
              });
          } else {
            Swal.fire({
              title: "Error",
              text: "User email not found in the database.",
              icon: "error",
              confirmButtonText: "OK",
              confirmButtonColor: "#DC2626",
            });
          }
        } else {
          Swal.fire({
            title: "Error",
            text: "User data not found in the database.",
            icon: "error",
            confirmButtonText: "OK",
            confirmButtonColor: "#DC2626",
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to fetch user data. Please try again.",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#DC2626",
        });
      });
  };
  

  const [activeTab, setActiveTab] = useState("profile");

  const handleTabChange = (tab) => {
    stopAudio();
    setActiveTab(tab);
  };

  const handleCloseSettings = () => {
    stopAudio();
    setIsSettingsOpen(false);
  };

  return (
    <div className="sidebar">
      <div className="profile">
        <img
          src="https://www.gravatar.com/avatar/0c7e6d76754563b76c56afdff6327d79?d=robohash"
          alt="Profile"
          className="profile-img"
        />
        <h3>{userName || "Loading..."} {surName || ""}</h3>
        <p>{branch || "Loading..."}</p>
      </div>
      <nav>
        <Link to="/Dashboard" className="stud-nav-item" onClick={handleSidebarLinkClick}>
          <FaHome className="stud-nav-icon" />
          <span>Dashboard</span>
        </Link>
        <Link to="/analytics" className="stud-nav-item" onClick={handleSidebarLinkClick}>
          <FaCertificate className="stud-nav-icon" />
          <span>Analytics</span>
        </Link>
        <Link to="/Courses" className="stud-nav-item" onClick={handleSidebarLinkClick}>
          <FaQuestionCircle className="stud-nav-icon" />
          <span>Courses</span>
        </Link>
        <div className="stud-nav-item" onClick={() => setIsSettingsOpen(true)}>
          <FaCog className="stud-nav-icon" />
          <span>Settings</span>
        </div>
      </nav>
      <div className="logout-btn" onClick={handleLogout}>
        <p>Logout</p>
      </div>

      {isSettingsOpen && (
        <div className="settings-overlay" ref={settingsRef}>
          <div className="settings-popup">
            <div className="settings-header">
              <div className="logo-placeholder">Logo</div>
              <h2>Settings</h2>
              <button className="close-btn" onClick={handleCloseSettings}>
                <FaTimes />
              </button>
            </div>
            <div className="settings-container">
              <div className="settings-sidebar">
                <div
                  className={`settings-section ${activeTab === "profile" ? "active" : ""}`}
                  onClick={() => handleTabChange("profile")}
                >
                  <FaUser className="section-icon" /> Profile
                </div>
                <div
                  className={`settings-section ${activeTab === "security" ? "active" : ""}`}
                  onClick={() => handleTabChange("security")}
                >
                  <FaLock className="section-icon" /> Security
                </div>
                <div
                  className={`settings-section ${activeTab === "voice" ? "active" : ""}`}
                  onClick={() => handleTabChange("voice")}
                >
                  <FaPlay className="section-icon" /> Voice
                </div>
                <div
                  className={`settings-section ${activeTab === "actions" ? "active" : ""}`}
                  onClick={() => handleTabChange("actions")}
                >
                  <FaTools className="section-icon" /> Actions
                </div>
              </div>
              <div className="settings-content">
                {activeTab === "profile" && (
                  <div className="settings-tab">
                    <h3>Profile</h3>
                    <div className="input-group">
                      <input
                        className="user-details-box"
                        placeholder="First Name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                      <input
                        className="user-details-box"
                        placeholder="Surname"
                        value={surName}
                        onChange={(e) => setSurName(e.target.value)}
                      />
                      <input
                        className="user-details-box"
                        placeholder="Branch"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                      />
                    </div>
                    <button
                      className="swal2-settings-btn"
                      onClick={() => updateUserData({ Name: userName, Surname: surName, Branch: branch })}
                    >
                      Save
                    </button>
                  </div>
                )}
                {activeTab === "security" && (
                  <div className="settings-tab">
                    <h3>Security</h3>
                    <button className="swal2-settings-btn" onClick={handleResetPassword}>
                      Send Reset Password Link
                    </button>
                  </div>
                )}
                {activeTab === "voice" && (
                  <div className="settings-tab">
                    <h3>Voice</h3>
                    <div className="voice-select">
                      <select
                        id="voice-model"
                        className="user-details-box"
                        value={selectedVoiceModel}
                        onChange={(e) => {
                          const voice = e.target.value;
                          setSelectedVoiceModel(voice);
                          playAudioSample(voice);
                        }}
                      >
                        <option value="microsoft-david">Microsoft David - English (United States)</option>
                        <option value="microsoft-hazel">Microsoft Hazel - English (United Kingdom)</option>
                        <option value="microsoft-susan">Microsoft Susan - English (United Kingdom)</option>
                        <option value="microsoft-heera">Microsoft Heera - English (India)</option>
                        <option value="microsoft-ravi">Microsoft Ravi - English (India)</option>
                        {/* <option value="google-hindi">Google हिन्दी</option> */}
                      </select>
                      <button
                        className="swal2-settings-btn"
                        onClick={saveAudioPreference}
                        style={{ marginTop: "10px" }}
                      >
                        Save Audio Preference
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === "actions" && (
                  <div className="settings-tab">
                    <h3>Actions</h3>
                    <button className="swal2-settings-btn" onClick={handleViewInfo}>
                      View Info
                    </button>
                    {/* <button className="swal2-settings-btn" onClick={handleDownloadAnalytics}>
                      Download Analytics CSV
                    </button> */}
                    <button className="swal2-settings-btn swal2-danger-btn" onClick={handleDeleteAccount}>
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;