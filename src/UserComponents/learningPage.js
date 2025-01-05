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
  const [currentModule, setCurrentModule] = useState(1);
  const [questionCount, setQuestionCount] = useState(3);
  const [moduleLength, setModuleLength] = useState(3);
  const [answers, setAnswers] = useState([]);
  const [isModuleCompleted, setIsModuleCompleted] = useState(false);
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuestionGenerated, setIsQuestionGenerated] = useState(false);
  const [isQuestionAnswered, setIsQuestionAnswerd] = useState(false);
  const [popupWindow, setPopupWindow] = useState(null); 
  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const db = getDatabase();
  let nextModule 
  const courseRef = ref(db, `Courses/${courseId}`);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isQuestionAnswered && isQuestionGenerated) {
        Swal.fire({
          title: "Critical Warning",
          text: "Our System has detected Tab Switiching",
          icon: "error",
          confirmButtonText: "Okay"
        });
        Swal.fire({
          title: "Tab Switched!! Generating new Question",
          icon: "error",
          position: "top",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        setShowQuestions(false);
        generateQuestions(nextModule)
      }
    };
    const handleWindowFocus = () => {
      if (popupWindow && popupWindow.closed) {
        if (!isQuestionAnswered && isQuestionGenerated) {
          Swal.fire({
            title: "Critical Warning",
            text: "You cannot leave the page until you answer the questions.",
            icon: "error",
            confirmButtonText: "Okay"
          });
        }
      }
    };
    const openPopup = () => {
      const popup = window.open('/your-popup-url', '_blank', 'width=600,height=400');
      setPopupWindow(popup);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isQuestionAnswered, isQuestionGenerated,popupWindow]);

  useEffect(() => {
    // Fetch course details if courseId exists
    if (!courseId) {
      navigate(`/courses`);
    } else {
      get(courseRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const courseData = snapshot.val();
            setCourseDetails(courseData);
          } else {
            alert("Course not found.");
          }
        })
        .catch((error) => {
          alert("Error fetching course data: " + error.message);
        });
    }

    // Define the handleMouseLeave function to warn the user if they try to leave the page
    const handleMouseLeave = (event) => {
      if (event.clientY < 10 && !isQuestionAnswered && isQuestionGenerated) {
        Swal.fire({
          title: "You cannot Leave the Page",
          text: "You haven't answered the question. Warning has been recorded.",
          icon: "warning",
        });
      }
    };

    // Block sidebar navigation if the question is not answered
    const blockSidebarNavigation = (event) => {
      if (!isQuestionAnswered && isQuestionGenerated) {
        event.preventDefault();
        Swal.fire({
          title: "Warning",
          text: "You cannot navigate away from this page until you answer the questions.",
          icon: "warning",
        });
      }
    };

    // Prevent the user from leaving the page or closing the tab
    const handleBeforeUnload = (event) => {
      if (!isQuestionAnswered && isQuestionGenerated) {
        const message = "You haven't answered the question. Are you sure you want to leave?";
        event.returnValue = message; // Standard for most browsers
        return message; // For some browsers
      }
    };

    // Add event listeners for mouse leave, before unload, and sidebar navigation block
    if (!isQuestionAnswered && isQuestionGenerated) {
      window.addEventListener("mouseout", handleMouseLeave);
      window.addEventListener("beforeunload", handleBeforeUnload);

      // Assuming the sidebar navigation elements have a class of 'sidebar-nav'
      const sidebarLinks = document.querySelectorAll(".sidebar-nav");
      sidebarLinks.forEach((link) => {
        link.addEventListener("click", blockSidebarNavigation);
      });
    }

    // Cleanup event listeners on component unmount or conditions change
    return () => {
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Cleanup sidebar navigation block
      const sidebarLinks = document.querySelectorAll(".sidebar-nav");
      sidebarLinks.forEach((link) => {
        link.removeEventListener("click", blockSidebarNavigation);
      });
    };
  }, [courseId, isQuestionAnswered, isQuestionGenerated, navigate]);

  

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
          setIsCourseCompleted(userData.completed || false);
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

    // Check if the user is logged in
    if (!userId) {
      alert("Please log in to apply for the course!");
      return;
    }

    // Check if the user has already applied for the course
    if (isAlreadyApplied) {
      alert("You have already applied for this course!");
      return;
    }

    // Reference to the user's progress in the course
    const userCourseRef = ref(
      db,
      `user/${userId}/InProgressCourses/${courseId}`
    );

    // Prepare the data to be saved to Firebase
    const courseData = {
      CorrectAnswer: 0,
      noOfQuestion: 3,
      ModuleCovered: 0,
      TotalModules: JSON.parse(courseDetails.courseContent).noOfModules || 0,
      Warning: 0,
      CurrentModule: 1,
      completed: false,
      CriticalWarning: 0,
    };

    // Set the course data in Firebase
    set(userCourseRef, courseData)
      .then(() => {
        alert("You have successfully applied for this course!");
        setIsAlreadyApplied(true); // Update the state to reflect the application status
        setContentVisible(false); // Hide the apply button once applied
      })
      .catch((error) => {
        console.error("Error applying for the course: ", error);
        alert(
          "An error occurred while applying for the course. Please try again."
        );
      });
  };

  const handlePrevious = () => {
    if (currentModule === 1) {
      setContentVisible(true);
      return;
    }
    setCurrentModule((prevModule) => prevModule - 1);
  };

  const generateQuestions = async (moduleNumber) => {
    setIsGenerating(true);
    try {
      const result = await model.generateContent(`
        Generate ${questionCount} questions based on the below concept with 4 options in this format:
        
       {
  "questions": [
    {
      "question": "What is AWT header class in Java?",
      "options": [
        { "option": "Swing", "isCorrect": true },
        { "option": "AWT", "isCorrect": false },
        { "option": "JDK", "isCorrect": false },
        { "option": "JRE", "isCorrect": false }
      ]
    }, etc ....        
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
      const generatedQuestions = JSON.parse(
        response.text().replace("```json", "").replace("```", "")
      );
      console.log(response.text());

      setAiQuestions(generatedQuestions.questions);
      setIsGenerating(false);
      setIsQuestionGenerated(true);
      Swal.fire({
        title: "Questions Generated!",
        icon: "success",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      setIsModuleCompleted(true);
      setShowQuestions(true); // Set this to true when questions are ready
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the questions.",
        icon: "error",
      });
      console.error(error);
    }
  };

  const handleQuestionValidate = () => {
    let correctAnswersCount = 0;

    // Loop through each AI-generated question
    aiQuestions.forEach((question, index) => {
      // Get the user's selected answer
      const selectedOption = document.querySelector(
        `input[name="question-${index}"]:checked`
      );

      if (selectedOption) {
        // Check if the selected option is the correct one
        const userAnswer = selectedOption.value;
        const correctOption = question.options.find(
          (option) => option.isCorrect
        ).option;

        if (userAnswer === correctOption) {
          correctAnswersCount++;
        }
      }
    });

    // Show alert with the result
    const totalQuestions = aiQuestions.length;
    const score = (correctAnswersCount / totalQuestions) * 100;
    Swal.fire({
      title: `Your score: ${score}%`,
      text: `You got ${correctAnswersCount} out of ${totalQuestions} correct.`,
      icon: score === 100 ? "success" : "error",
      confirmButtonText: "OK",
    });

    // If the score is 100%, mark the module as completed and move to the next module
    if (score === 100) {
      setIsQuestionAnswerd(true);
      setIsModuleCompleted(true);
      setShowQuestions(false);
      handleNext(); 
    }
  };

  const handleNext = async () => {
    // Check if AI is generating questions
    if (isGenerating) {
      Swal.fire({
        title: "Warning",
        text: "Questions are still being generated. Please wait before proceeding.",
        icon: "warning",
      });
      return;
    }

    // Prevent proceeding if the current module is the last one
    if (currentModule === moduleLength) {
      return;
    }

    try {
      const userCookie = getUserIdFromCookie();
      const moduleRef = ref(
        db,
        `user/${userCookie}/InProgressCourses/${courseId}`
      );

      // If the current module is completed, update Firebase progress
      if (currentModule === moduleLength) {
        await update(moduleRef, {
          completed: true,
        });
      }

      setContentVisible(false);
      nextModule = currentModule + 1;

      // Generate questions for the next module if not already completed
      if (!isModuleCompleted) {
        generateQuestions(nextModule);
      }

      // Ensure questions are generated before proceeding to the next module
      if (!isModuleCompleted) {
        Swal.fire({
          title: "Warning",
          text: "Please complete the questions before proceeding.",
          icon: "warning",
        });
        return;
      }

      setCurrentModule(nextModule);

      // Update Firebase with the progress to the next module
      try {
        if (isModuleCompleted) {
          await update(moduleRef, {
            ModuleCovered: nextModule,
            CurrentModule: nextModule,
          });
        }

        // If the next module is the last one, mark the course as completed
        if (nextModule === moduleLength) {
          await update(moduleRef, {
            completed: true,
          });
        }
        console.log("User progress updated successfully!");
      } catch (error) {
        console.error("Error updating user progress:", error);
      }
    } catch (error) {
      console.error("Error during next module handling:", error);
    }
  };

  return (
    <div className="learning-page-container">
    <Sidebar
        isQuestionAnswered={isQuestionAnswered}
        isQuestionGenerated={isQuestionGenerated}
      />
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
                {courseDetails ? (
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
                ) : (
                  <div>Loading course details...</div>
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
                    {showQuestions && (
                      <div className="question-course-info">
                        <h2>Answer the Questions</h2>
                        {aiQuestions.map((question, index) => (
                          <div key={index} className="question-course-section">
                            <h3>
                              {index + 1}. {question.question}
                            </h3>
                            <div className="options-container">
                              {question.options.map((option, optionIndex) => (
                                <label key={optionIndex}>
                                  <input
                                    type="radio"
                                    value={option.option}
                                    name={`question-${index}`}
                                  />
                                  <span className="option-label">
                                    {option.option}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button
                          className="NextQuestion"
                          onClick={handleQuestionValidate}
                        >
                          Next
                        </button>
                      </div>
                    )}
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
