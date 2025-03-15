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

function Assessment() {
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [courseDetails, setCourseDetails] = useState({});
  const [assessmentStatus, setAssessmentStatus] = useState({}); // New state for assessment completion
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userSessionCred = Cookies.get("userSessionCred");
    if (!userSessionCred) {
      setError("User not logged in. Please log in to view assessments.");
      setLoading(false);
      return;
    }

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

          // Fetch course details and assessment status for each course
          coursesArray.forEach((course) => {
            // Fetch course details
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

            // Fetch assessment completion status
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

  // Navigate to assessmenttest with courseId in state
  const handleStartAssessment = (courseId) => {
    navigate("/assessmenttest", { state: { courseId } });
  };

  // Handle certificate download
  const handleDownloadCertificate = (courseId) => {
    // Placeholder for certificate download logic
    Swal.fire("Success", `Certificate for course ${courseId} download initiated!`, "success");
    // Example: navigate("/certificate", { state: { courseId } });
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
                        onClick={() => handleDownloadCertificate(course.id)}
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