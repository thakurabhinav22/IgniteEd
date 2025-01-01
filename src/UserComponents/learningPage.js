import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import "./learningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, set } from "firebase/database";

function LearningPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId } = location.state || {};
  const [contentVisible, setContentVisible] = useState(true);
  const [courseDetails, setCourseDetails] = useState(null);
  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false); // New state to track if the course is already applied

  const db = getDatabase();
  const courseRef = ref(db, `Courses/${courseId}`);

  useEffect(() => {
    if (!courseId) {
      navigate(`/courses`);
    } else {
      // Fetch course content from Firebase
      get(courseRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const courseData = snapshot.val();
            setCourseDetails(courseData); // Store course data in state
          } else {
            alert("Course not found.");
          }
        })
        .catch((error) => {
          alert("Error fetching course data: " + error.message);
        });
    }
  }, [courseId, navigate]);

  // Function to get the user ID from cookies
  const getUserIdFromCookie = () => {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('userSessionCred='));

    if (cookieValue) {
      return cookieValue.split('=')[1]; // Extract the userId from the cookie
    }
    return null;
  };

  // Check if the user has already applied for this course
  useEffect(() => {
    const userId = getUserIdFromCookie(); // Get the current user ID from the cookie
    if (userId) {
      const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
      get(userCourseRef).then((snapshot) => {
        if (snapshot.exists()) {
          setIsAlreadyApplied(true); // If the course data exists, set to true
          setContentVisible(false); // Hide content as the user already applied
        }
      });
    }
  }, [courseId]);

  const handleApplyClick = () => {
    const userId = getUserIdFromCookie(); // Get the current user ID from the cookie
    if (!userId) {
      alert("Please log in to apply for the course!");
      return;
    }

    if (isAlreadyApplied) {
      // Show an alert if the user is already enrolled
      alert("You have already applied for this course!");
      return;
    }

    // Firebase Realtime Database reference
    const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);

    // Data structure to store for the course
    const courseData = {
      CorrectAnswer: 0,
      noOfQuestion: 3,
      ModuleCovered: 0,
      TotalModules: JSON.parse(courseDetails.courseContent).noOfModules || 0,
      Warning: 0,
      CurrentModule: 0
    };

    // Set the course data in Firebase
    set(userCourseRef, courseData)
      .then(() => {
        alert("You have successfully applied for the course!");
        setContentVisible(false); // Hide content after applying
      })
      .catch((error) => {
        alert("Error applying for the course: " + error.message);
      });
  };

  return (
    <div className="learning-page-container">
      {console.log("Course Id for Learning Page:", courseId)}
      <Sidebar />
      <div className="learning-content">
        {contentVisible ? (
          <>
            {isAlreadyApplied ? (
              <div className="empty-content">
                <h2>Thank you for applying!</h2>
                <p>You have already enrolled in this course. You will receive further instructions in your registered email.</p>
              </div>
            ) : (
              <>
                {courseDetails && (
                  <>
                    <h1 className="learning-title">{courseDetails.courseName}</h1>
                    <div className="course-info">
                      <div className="course-section">
                        <h2>Introduction</h2>
                        <p>{courseDetails.courseContent && JSON.parse(courseDetails.courseContent).Introduction}</p>
                        <button className="apply-button" onClick={handleApplyClick}>
                          Apply for Course
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
                    <h1 className="learning-title">{courseDetails.courseName}</h1>
                    <div className="course-info">
                      <div className="course-section">
                        <h2>{JSON.parse(courseDetails.courseContent).moduletitle1}</h2>
                        <h2 >Concept</h2>
                        <p>{JSON.parse(courseDetails.courseContent).moduel1concept}</p>
                        <h2 >Example and Analogy</h2>
                        <p>{JSON.parse(courseDetails.courseContent).moduel1ExampleandAnalogy}</p>
                      </div>
                    </div>
                  </>
        )}
      </div>
    </div>
  );
}

export default LearningPage;
