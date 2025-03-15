import React, { useState, useEffect } from "react";
import "./Assessment.css";
import Sidebar from "./Sidebar";
import Cookies from "js-cookie";
import { database } from "../Admin/firebase"; // Adjust path to your firebase.js
import { ref, onValue, off, get } from "firebase/database";
import { FaUser, FaQuestionCircle, FaClock, FaCheckCircle, FaTimes } from "react-icons/fa";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function Assessment() {
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [courseDetails, setCourseDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null); // State for course content
  const [showContent, setShowContent] = useState(false); // Toggle overlay visibility

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

  // Function to fetch course content and show it
  const handleStartAssessment = async (courseId) => {
    try {
      const contentRef = ref(database, `Courses/${courseId}/courseContent`);
      const snapshot = await get(contentRef);
      if (snapshot.exists()) {
        const courseContent = snapshot.val();
        setSelectedContent(courseContent);
        setShowContent(true); // Show the overlay
      } else {
        console.log(`No course content found for ${courseId}`);
        setSelectedContent({ message: "No content available for this course." });
        setShowContent(true);
      }
    } catch (err) {
      console.error(`Error fetching course content for ${courseId}:`, err.message);
      setSelectedContent({ error: `Error: ${err.message}` });
      setShowContent(true);
    }
  };

  // Function to close the content overlay
  const closeContent = () => {
    setShowContent(false);
    setSelectedContent(null);
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
                    {course.completed ? (
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

        {/* Full-screen black overlay for course content */}
        {showContent && (
          <div className="content-overlay">
            <button className="close-btn" onClick={closeContent}>
              <FaTimes />
            </button>
            <div className="content-display">
              <h2>Course Content</h2>
              {selectedContent?.error ? (
                <p className="content-error">{selectedContent.error}</p>
              ) : selectedContent?.message ? (
                <p className="content-message">{selectedContent.message}</p>
              ) : (
                <pre>{JSON.stringify(selectedContent, null, 2)}</pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Assessment;