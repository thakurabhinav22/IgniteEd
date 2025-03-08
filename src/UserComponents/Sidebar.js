import React, { useEffect, useState, useRef } from "react";
import "./Sidebar.css";
import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaCertificate, FaQuestionCircle, FaCog, FaUser, FaLock, FaTools, FaTimes, FaPlay } from "react-icons/fa";
import { getDatabase, ref, get, update, remove, set } from "firebase/database";
import Swal from "sweetalert2";

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
        utterance.text = "नमस्ते, यह ऑडियो उदाहरण है ताकि आप अपने कोर्स रीडिंग में पसंदीदा ऑडियो चुन सकें।";
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
        <input type="password" id="swal-password" class="swal2-input dark-input" placeholder="Password">
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
    Swal.fire({
      title: "Reset Password",
      text: "A password reset link would be sent to your registered email address.",
      icon: "info",
      confirmButtonText: "OK",
      confirmButtonColor: "#1E3A8A",
    });
  };

  const handleForgotPassword = () => {
    Swal.fire({
      title: "Forgot Password",
      html: `
        <p>Enter your email to receive a reset link:</p>
        <input type="email" id="swal-email" class="swal2-input dark-input" placeholder="Email">
      `,
      showCancelButton: true,
      confirmButtonText: "Send",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1E3A8A",
      cancelButtonColor: "#6B7280",
      preConfirm: () => {
        const email = document.getElementById("swal-email").value;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage("Please enter a valid email address!");
          return false;
        }
        return email;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Reset Link Sent",
          text: `A password reset link has been sent to ${result.value}. Please check your inbox.`,
          icon: "success",
          confirmButtonColor: "#1E3A8A",
        });
      }
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
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
        stopAudio(); // Stop audio when clicking outside
        setIsSettingsOpen(false);
      }
    };

    // Cleanup: stop audio when component unmounts
    return () => {
      stopAudio();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userId]);

  const [activeTab, setActiveTab] = useState("profile");

  const handleTabChange = (tab) => {
    stopAudio(); // Stop audio when switching tabs
    setActiveTab(tab);
  };

  const handleCloseSettings = () => {
    stopAudio(); // Stop audio when closing settings
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
        <Link to="/Dashboard" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaHome className="nav-icon" />
          <span>Dashboard</span>
        </Link>
        <Link to="/analytics" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaCertificate className="nav-icon" />
          <span>Analytics</span>
        </Link>
        <Link to="/Courses" className="nav-item" onClick={handleSidebarLinkClick}>
          <FaQuestionCircle className="nav-icon" />
          <span>Courses</span>
        </Link>
        <div className="nav-item" onClick={() => setIsSettingsOpen(true)}>
          <FaCog className="nav-icon" />
          <span>Settings</span>
        </div>
      </nav>
      <div className="logout-btn" onClick={() => navigate("/")}>
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
                        className="dark-input"
                        placeholder="First Name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                      <input
                        className="dark-input"
                        placeholder="Surname"
                        value={surName}
                        onChange={(e) => setSurName(e.target.value)}
                      />
                      <input
                        className="dark-input"
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
                    <p className="forgot-password">
                      <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}>
                        Forgot Password?
                      </a>
                    </p>
                  </div>
                )}
                {activeTab === "voice" && (
                  <div className="settings-tab">
                    <h3>Voice</h3>
                    <div className="voice-select">
                      <select
                        id="voice-model"
                        className="dark-input"
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
                        <option value="google-hindi">Google हिन्दी</option>
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
                    <button className="swal2-settings-btn" onClick={handleDownloadAnalytics}>
                      Download Analytics CSV
                    </button>
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