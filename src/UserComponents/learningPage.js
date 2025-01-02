import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import "./learningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, set, update } from "firebase/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";

function LearningPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId } = location.state || {};
  const [contentVisible, setContentVisible] = useState(true);
  const [courseDetails, setCourseDetails] = useState(null);
  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false);
  let [currentModule, setCurrentModule] = useState(1);
  let [questionCount, setQuestionCount] = useState(3);
  const [moduleLength, setModuleLength] = useState(3);
  const [answers, setAnswers] = useState([]);
  const [isModuleCompleted, setIsModuleCompleted] = useState(false);
  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
      const userCourseRef = ref(
        db,
        `user/${userId}/InProgressCourses/${courseId}`
      );
      const CourseRef = ref(db, `Courses/${courseId}`);
      get(userCourseRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setIsAlreadyApplied(true);
          setContentVisible(false);
          setCurrentModule(userData.CurrentModule || 1);
          setModuleLength(userData.TotalModules || 1);
        }
      });
      get(CourseRef).then((snapshot) => {
        if (snapshot.exists()) {
          const CourseData = snapshot.val();
          setQuestionCount(CourseData.numQuestions || 3);
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

    const userCourseRef = ref(
      db,
      `user/${userId}/InProgressCourses/${courseId}`
    );
    const courseData = {
      CorrectAnswer: 0,
      noOfQuestion: 3,
      ModuleCovered: 0,
      TotalModules: JSON.parse(courseDetails.courseContent).noOfModules || 0,
      Warning: 0,
      CurrentModule: 1,
    };
  };

  const handlePrevious = () => {
    if (currentModule === 1) {
      setContentVisible(true);
      return;
    }
    setCurrentModule((prevModule) => prevModule - 1);
  };

  const handleNext = async () => {
    if (currentModule === moduleLength) {
      return; // Stop navigation beyond the last module
    }

    const userCookie = getUserIdFromCookie();
    const moduleRef = ref(
      db,
      `user/${userCookie}/InProgressCourses/${courseId}`
    );

    setContentVisible(false);
    const nextModule = currentModule + 1;
    setCurrentModule(nextModule);

    // Check if the user has answered at least 60% of the current module's questions
    const correctAnswers = answers.filter((answer) => answer.correct === true);
    const percentage = (correctAnswers.length / questionCount) * 100;

    if (currentModule < nextModule) {
      try {
        const moduleRef = ref(db, `user/${userCookie}/InProgressCourses/${courseId}`);
        await update(moduleRef, {
          ModuleCovered: nextModule,
          CurrentModule: nextModule,
        });
        console.log("User progress updated successfully!");
      } catch (error) {
        console.error("Error updating user progress:", error);
      }
    } else {
      console.log("No further module to progress.");
    }
    // Generate questions for next module
    // await generateQuestions(nextModule);
  };

  const generateQuestions = async (moduleNumber) => {
    try {
      const result = await model.generateContent(`
        Generate ${questionCount} questions based on the below concept with 4 options in this format:
        
        1. Question
           <span className="q1Option1"></span>
           <span className="q1Option2"></span>
           <span className="q1Option3"></span>
           <span className="q1Option4"></span>
        
        Content: 
          Title: ${
            JSON.parse(courseDetails.courseContent)[
              `moduletitle${moduleNumber}`
            ]
          }
          Concept: ${
            JSON.parse(courseDetails.courseContent)[
              `module${moduleNumber}concept`
            ]
          }
          Example and Analogy: ${
            JSON.parse(courseDetails.courseContent)[
              `module${moduleNumber}ExampleandAnalogy`
            ]
          }
      `);

      const response = await result.response;

      // Notify the user
      Swal.fire({
        title: "Questions Generated!",
        icon: "success",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      setIsModuleCompleted(true); // Set module completion status
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the questions.",
        icon: "error",
      });
      console.error(error);
    }
  };

  return (
    <div className="learning-page-container">
      <Sidebar />
      <div className="learning-content">
        {contentVisible ? (
          <>
            {isAlreadyApplied ? (
              <div className="empty-content">
                <h2>Thank you for applying!</h2>
                <p>
                  You have already enrolled in this course. You will receive
                  further instructions in your registered email.
                </p>
              </div>
            ) : (
              <>
                {courseDetails && (
                  <>
                    <h1 className="learning-title">
                      {courseDetails.courseName}
                    </h1>
                    <div className="course-info">
                      <div className="course-section">
                        <h2>Introduction</h2>
                        <p>
                          {courseDetails.courseContent &&
                            JSON.parse(courseDetails.courseContent)
                              .Introduction}
                        </p>
                        <button
                          className="apply-button"
                          onClick={handleApplyClick}
                        >
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
                <h2>
                  {
                    JSON.parse(courseDetails.courseContent)[
                      `moduletitle${currentModule}`
                    ]
                  }
                </h2>
                <h2>Concept</h2>
                <p>
                  {
                    JSON.parse(courseDetails.courseContent)[
                      `module${currentModule}concept`
                    ]
                  }
                </p>
                <h2>Example and Analogy</h2>
                <p>
                  {
                    JSON.parse(courseDetails.courseContent)[
                      `module${currentModule}ExampleandAnalogy`
                    ]
                  }
                </p>
                {isModuleCompleted ? (
                  <>
                    <h2>Answer the Questions</h2>
                    {/* Render questions for the user to answer */}
                  </>
                ) : (
                  <div>
                    <button
                      className="previous-button"
                      onClick={handlePrevious}
                      style={{
                        display: currentModule === 1 ? "none" : "inline-block",
                      }}
                    >
                      Previous
                    </button>
                    <button
                      className="next-button"
                      onClick={handleNext}
                      style={{
                        display:
                          currentModule === moduleLength
                            ? "none"
                            : "inline-block",
                      }}
                    >
                      Next
                    </button>
                    {currentModule === moduleLength && (
                      <button className="next-button">Complete</button>
                    )}
                  </div>
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
