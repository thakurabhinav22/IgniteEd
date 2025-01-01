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
  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false);
  let [currentModule, setCurrentModule] = useState(1); 
  const [ModuleLength , setModuleLength] = useState(1);
 

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

  const getUserIdFromCookie = () => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userSessionCred="));

    if (cookieValue) {
      return cookieValue.split("=")[1];
    }
    return null;
  };

  useEffect(() => {
    const userId = getUserIdFromCookie();
    if (userId) {
      const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
      get(userCourseRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setIsAlreadyApplied(true);
          setContentVisible(false);
          setCurrentModule(userData.CurrentModule || 1); 
          setModuleLength(userData.TotalModules || 1);
        }
      });
    }
  }, [courseId]);

  const handleApplyClick = () => {
    const userId = getUserIdFromCookie();
    if (!userId) {
      alert("Please log in to apply for the course!");
      return;
    }

    if (isAlreadyApplied) {
      alert("You have already applied for this course!");
      return;
    }

    const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
    const courseData = {
      CorrectAnswer: 0,
      noOfQuestion: 3,
      ModuleCovered: 0,
      TotalModules: JSON.parse(courseDetails.courseContent).noOfModules || 0,
      Warning: 0,
      CurrentModule: 1,
    };

    set(userCourseRef, courseData)
      .then(() => {
        alert("You have successfully applied for the course!");
        setContentVisible(false);
      })
      .catch((error) => {
        alert("Error applying for the course: " + error.message);
      });
  };

  const handlePrevious = () => {
    if (currentModule === 1) {
      setContentVisible(true); // Show introduction
      return;
    }
    setCurrentModule((prevModule) => prevModule - 1);
  };
  
  const handleNext = () => {
    if (currentModule === ModuleLength) {
      return;
    }
    setContentVisible(false); // Hide introduction
    setCurrentModule((prevModule) => prevModule + 1);
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
      <h2>Module {currentModule}</h2>
      <h2>{JSON.parse(courseDetails.courseContent)[`moduletitle${currentModule}`]}</h2>
      <h2>Concept</h2>
      <p>{JSON.parse(courseDetails.courseContent)[`module${currentModule}concept`]}</p>
      <h2>Example and Analogy</h2>
      <p>{JSON.parse(courseDetails.courseContent)[`module${currentModule}ExampleandAnalogy`]}</p>
      <button
        className="previous-button"
        onClick={handlePrevious}
        style={{ display: currentModule === 1 ? "none" : "inline-block" }}
      >
        Previous
      </button>
      <button
        className="next-button"
        onClick={handleNext}
        style={{ display: currentModule === ModuleLength ? "none" : "inline-block" }}
      >
        Next
      </button>
      {currentModule === ModuleLength && (
        <button className="next-button">Complete</button>
      )}
    </div>
  </div>
</>


        )}
      </div>
    </div>
  );
}

export default LearningPage;
