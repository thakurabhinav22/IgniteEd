import React, { useState, useEffect } from "react";
import "./Assessment.css";
import Sidebar from "./Sidebar";
import Cookies from "js-cookie";
import { database } from "../Admin/firebase";
import { ref, onValue, off } from "firebase/database";
import { FaUser, FaQuestionCircle, FaClock, FaCheckCircle } from "react-icons/fa";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";

function Assessment() {
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [courseDetails, setCourseDetails] = useState({});
  const [assessmentStatus, setAssessmentStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userSessionCred = Cookies.get("userSessionCred");
    if (!userSessionCred) {
      setError("User not logged in. Please log in to view assessments.");
      setLoading(false);
      return;
    }

    const userNameRef = ref(database, `user/${userSessionCred}/Name`);
    onValue(
      userNameRef,
      (snapshot) => {
        const name = snapshot.val();
        if (name) {
          setUserName(name);
          console.log("User Name:", name);
        } else {
          console.warn("No name found for user.");
        }
      },
      (err) => {
        console.error("Failed to fetch user name:", err.message);
      }
    );

    const inProgressRef = ref(database, `user/${userSessionCred}/InProgressCourses`);
    const unsubscribeInProgress = onValue(
      inProgressRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const coursesArray = Object.entries(data).map(([id, course]) => ({
            id,
            ...course,
          }));
          setInProgressCourses(coursesArray);
          console.log("In-Progress Course IDs:", coursesArray.map((c) => c.id));

          coursesArray.forEach((course) => {
            const courseDetailRef = ref(database, `Courses/${course.id}`);
            onValue(
              courseDetailRef,
              (detailSnapshot) => {
                const detailData = detailSnapshot.val();
                if (detailData) {
                  setCourseDetails((prev) => ({
                    ...prev,
                    [course.id]: { ...detailData, completed: course.completed },
                  }));
                }
              },
              (err) => {
                setError(`Failed to fetch details for ${course.id}: ${err.message}`);
              }
            );

            const assessmentRef = ref(
              database,
              `user/${userSessionCred}/${course.id}/assessmentComplete`
            );
            onValue(
              assessmentRef,
              (assessmentSnapshot) => {
                const isComplete = assessmentSnapshot.exists() && assessmentSnapshot.val() === true;
                setAssessmentStatus((prev) => ({
                  ...prev,
                  [course.id]: isComplete,
                }));
              },
              (err) => {
                console.error(`Failed to fetch assessment status for ${course.id}: ${err.message}`);
              }
            );
          });
        } else {
          setInProgressCourses([]);
          console.log("No in-progress courses found.");
        }
        setLoading(false);
      },
      (err) => {
        setError("Failed to fetch in-progress courses: " + err.message);
        setLoading(false);
      }
    );

    return () => off(inProgressRef, "value", unsubscribeInProgress);
  }, []);

  const handleStartAssessment = (courseId) => {
    navigate("/assessmenttest", { state: { courseId } });
  };

  // Handle certificate download
  const handleDownloadCertificate = async (courseId, courseName, authorName) => {
    if (!userName || !courseName || !authorName) {
      Swal.fire(
        "Error",
        "User name, course name, and author name are required. Cannot generate certificate.",
        "error"
      );
      return;
    }
  
    // Get the current date
    const currentDate = new Date().toLocaleDateString();
  
    // Log the data being sent (for debugging)
    console.log("Sending data to backend:", {
      name: userName,
      course: courseName,
      date: currentDate,
      instructor: authorName,
    });
  
    try {
      const response = await axios.post(
        "https://tlm-server.onrender.com/generate",
        {
          name: userName,
          course: courseName,
          date: currentDate,
          instructor: authorName,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
    );
    console.log(userName, courseName, currentDate, authorName);  
    
  
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${userName}_certificate.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  
      Swal.fire("Success", `Certificate for course ${courseName} downloaded!`, "success");
    } catch (error) {
      console.error("Error downloading certificate:", error);
      const errorMessage = error.response?.data
        ? await new Response(error.response.data).text()
        : error.message;
      Swal.fire("Error", `Failed to download certificate: ${errorMessage}`, "error");
    }
  };
  return (
    <div className="assessment-container">
      <Sidebar />
      <div className="assessment-content">
        <h1 className="assessment-title">Your Assessments</h1>
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading assessments...</p>
          </div>
        )}
        {error && (
          <div className="error-container">
            <FaCheckCircle className="error-icon" />
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && inProgressCourses.length === 0 && (
          <p className="no-courses">No in-progress courses found.</p>
        )}
        {!loading && !error && inProgressCourses.length > 0 && (
          <div className="assessment-grid">
            {inProgressCourses.map((course) => {
              const details = courseDetails[course.id] || {};
              const progress =
                ((course.ModuleCovered || 0) / (course.TotalModules || 1)) * 100;
              const isAssessmentComplete = assessmentStatus[course.id] || false;

              return (
                <div key={course.id} className="assessment-card">
                  <div className="card-header">
                    <h2>{details.courseName || "Untitled Course"}</h2>
                  </div>
                  <div className="card-body">
                    <p>
                      <FaUser className="info-icon" /> Author: {details.authorName || "N/A"}
                    </p>
                    {details.moduleDetail?.noOfQuestion && (
                      <p>
                        <FaQuestionCircle className="info-icon" /> Questions:{" "}
                        {details.moduleDetail.noOfQuestion}
                      </p>
                    )}
                    {(details.time || course.time) && (
                      <p>
                        <FaClock className="info-icon" /> Time: {details.time || course.time}
                      </p>
                    )}
                    <div className="progress-container">
                      <CircularProgressbar
                        value={progress}
                        text={course.completed ? "Completed" : `${progress.toFixed(0)}%`}
                        styles={buildStyles({
                          pathColor: course.completed ? "#27ae60" : "#3498db",
                          textColor: course.completed ? "#27ae60" : "#34495e",
                          trailColor: "#ecf0f1",
                        })}
                      />
                    </div>
                  </div>
                  <div className="card-footer">
                    {isAssessmentComplete ? (
                      <button
                        className="start-btn"
                        onClick={() =>
                          handleDownloadCertificate(
                            course.id,
                            details.courseName || "Untitled Course",
                            details.authorName || "N/A"
                          )
                        }
                      >
                        Download Certificate
                      </button>
                    ) : course.completed ? (
                      <button
                        className="start-btn"
                        onClick={() => handleStartAssessment(course.id)}
                      >
                        Start Assessment
                      </button>
                    ) : (
                      <p className="incomplete-message">
                        Complete the course to unlock the assessment.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Assessment;