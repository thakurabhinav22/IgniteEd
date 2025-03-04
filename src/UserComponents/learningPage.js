import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import "./learningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, set, update } from "firebase/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";
import Loading from "../icons/Loading.gif";
import TextToSpeeh from "../icons/text_to_speech.svg";
import { Volume2, Pause, Play } from "lucide-react";
import speaker from "../icons/speaker.png";
import speaking from "../icons/speaking.gif";

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
  const [startTime, setStartTime] = useState(null); // Timer start time
  const [totalTime, setTotalTime] = useState(0); // Total time in seconds
  const [timerInterval, setTimerInterval] = useState(null); // Interval ID for clearing
  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const db = getDatabase();
  let nextModule;
  const courseRef = ref(db, `Courses/${courseId}`);

  // Start the timer when questions are generated
  useEffect(() => {
    if (isQuestionGenerated && !startTime) {
      setStartTime(Date.now());
      const interval = setInterval(() => {
        setTotalTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setTimerInterval(interval);
    }
  }, [isQuestionGenerated, startTime]);

  // Stop the timer and save to Firebase when the course is completed
  useEffect(() => {
    if (isCourseCompleted && timerInterval) {
      clearInterval(timerInterval);
      const userId = getUserIdFromCookie();
      const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
      update(userCourseRef, { totalTimeTaken: totalTime })
        .then(() => {
          console.log(`Total time of ${totalTime} seconds stored in Firebase`);
          Swal.fire({
            title: "Course Completed!",
            text: `You took ${formatTime(totalTime)} to complete the course.`,
            icon: "success",
          });
        })
        .catch((error) => {
          console.error("Error storing time in Firebase:", error);
        });
    }
  }, [isCourseCompleted, timerInterval, totalTime]);

  // Helper function to format time in HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        !isQuestionAnswered &&
        isQuestionGenerated
      ) {
        Swal.fire({
          title: "Critical Warning",
          text: "Our System has detected Tab Switching",
          icon: "error",
          confirmButtonText: "Okay",
        });

        setShowQuestions(false);
        generateQuestions(nextModule);
      }
    };
    const handleWindowFocus = () => {
      if (popupWindow && popupWindow.closed) {
        if (!isQuestionAnswered && isQuestionGenerated) {
          Swal.fire({
            title: "Critical Warning",
            text: "You cannot leave the page until you answer the questions.",
            icon: "error",
            confirmButtonText: "Okay",
          });
        }
      }
    };
    const openPopup = () => {
      const popup = window.open(
        "/your-popup-url",
        "_blank",
        "width=600,height=400"
      );
      setPopupWindow(popup);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isQuestionAnswered, isQuestionGenerated, popupWindow]);

  useEffect(() => {
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

    const handleMouseLeave = (event) => {
      if (event.clientY < 10 && !isQuestionAnswered && isQuestionGenerated) {
        Swal.fire({
          title: "You cannot Leave the Page",
          text: "You haven't answered the question. Warning has been recorded.",
          icon: "warning",
        });
      }
    };

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

    const handleBeforeUnload = (event) => {
      if (!isQuestionAnswered && isQuestionGenerated) {
        const message =
          "You haven't answered the question. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    if (!isQuestionAnswered && isQuestionGenerated) {
      window.addEventListener("mouseout", handleMouseLeave);
      window.addEventListener("beforeunload", handleBeforeUnload);
      const sidebarLinks = document.querySelectorAll(".sidebar-nav");
      sidebarLinks.forEach((link) => {
        link.addEventListener("click", blockSidebarNavigation);
      });
    }

    return () => {
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
      completed: false,
      CriticalWarning: 0,
    };

    set(userCourseRef, courseData)
      .then(() => {
        alert("You have successfully applied for this course!");
        setIsAlreadyApplied(true);
        setContentVisible(false);
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
        Generate ${questionCount} questions based on the below concept with 4 options in this format.
        Note Question should be only based Content :
        
       {
  "questions": [
    {
      "question": "Questiobn Should be Based on Content only",
      "options": [
        { "option": "Option A", "isCorrect": true },
        { "option": "Option B", "isCorrect": false },
        { "option": "Option C", "isCorrect": false },
        { "option": "Option D", "isCorrect": false }
      ]
    }, etc ....        
        Content: 
          Title: ${JSON.parse(courseDetails.courseContent)[`moduletitle${moduleNumber}`]}
          Concept: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}concept`]}
          Example and Analogy: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}ExampleandAnalogy`]}
      `);

      const response = await result.response;
      const generatedQuestions = JSON.parse(
        response.text().replace("```json", "").replace("```", "")
      );
      console.log(response.text());

      setAiQuestions(generatedQuestions.questions);
      setIsGenerating(false);
      setIsQuestionGenerated(true); // Trigger timer start
      Swal.fire({
        title: "Questions Generated!",
        icon: "success",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      setIsModuleCompleted(true);
      setShowQuestions(true);
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

    aiQuestions.forEach((question, index) => {
      const selectedOption = document.querySelector(
        `input[name="question-${index}"]:checked`
      );

      if (selectedOption) {
        const userAnswer = selectedOption.value;
        const correctOption = question.options.find(
          (option) => option.isCorrect
        ).option;

        if (userAnswer === correctOption) {
          correctAnswersCount++;
        }
      }
    });

    const totalQuestions = aiQuestions.length;
    const score = (correctAnswersCount / totalQuestions) * 100;
    Swal.fire({
      title: `Your score: ${score}%`,
      text: `You got ${correctAnswersCount} out of ${totalQuestions} correct.`,
      icon: score === 100 ? "success" : "error",
      confirmButtonText: "OK",
    });

    if (score === 100) {
      setIsQuestionAnswerd(true);
      setIsModuleCompleted(true);
      setShowQuestions(false);
      handleNext();
    }
  };

  const handleNext = async () => {
    if (isGenerating) {
      Swal.fire({
        title: "Warning",
        text: "Questions are still being generated. Please wait before proceeding.",
        icon: "warning",
      });
      return;
    }

    if (currentModule === moduleLength) {
      setIsCourseCompleted(true); // Trigger course completion and time save
      return;
    }

    try {
      const userCookie = getUserIdFromCookie();
      const moduleRef = ref(
        db,
        `user/${userCookie}/InProgressCourses/${courseId}`
      );

      if (currentModule === moduleLength) {
        await update(moduleRef, {
          completed: true,
        });
      }

      setContentVisible(false);
      nextModule = currentModule + 1;

      if (!isModuleCompleted) {
        generateQuestions(nextModule);
      }

      if (!isModuleCompleted) {
        Swal.fire({
          title: "Warning",
          text: "Please complete the questions before proceeding.",
          icon: "warning",
        });
        return;
      }

      setCurrentModule(nextModule);

      try {
        if (isModuleCompleted) {
          await update(moduleRef, {
            ModuleCovered: nextModule,
            CurrentModule: nextModule,
          });
        }

        if (nextModule === moduleLength) {
          await update(moduleRef, {
            completed: true,
          });
          setIsCourseCompleted(true); // Trigger course completion
        }
        console.log("User progress updated successfully!");
      } catch (error) {
        console.error("Error updating user progress:", error);
      }
    } catch (error) {
      console.error("Error during next module handling:", error);
    }
  };

  const [speech, setSpeech] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  const handleTextToSpeech = () => {
    if (!courseDetails) {
      Swal.fire({
        title: "Error",
        text: "No course content available.",
        icon: "error",
      });
      return;
    }

    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setIsPaused(true);
      return;
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    const moduleNumber = currentModule;
    const content = `
        Title: ${JSON.parse(courseDetails.courseContent)[`moduletitle${moduleNumber}`]}
        Concept: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}concept`]}
        Example and Analogy: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}ExampleandAnalogy`]}
      `;

    const newSpeech = new SpeechSynthesisUtterance(content);
    newSpeech.lang = "en-US";
    newSpeech.rate = speed;
    newSpeech.pitch = 1;

    newSpeech.onend = () => {
      setIsPaused(false);
      setSpeech(null);
    };

    setSpeech(newSpeech);
    speechSynthesis.speak(newSpeech);
  };

  const handleSpeedChange = (e) => {
    setSpeed(parseFloat(e.target.value));
    if (speech) {
      speech.rate = parseFloat(e.target.value);
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
                  <div className="loading-container">
                    <img src={Loading} className="loading-gif"></img>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <h1 className="learning-title">{courseDetails.courseName}</h1>
            <div className="course-info">
              <div className="course-section">
                <button className="speak_container" onClick={handleTextToSpeech}>
                  {isPaused || !speechSynthesis.speaking ? (
                    <img
                      src={speaker}
                      alt="Speaker Icon"
                      className="speaker_icon"
                    />
                  ) : (
                    <img
                      src={speaking}
                      alt="Speaking Icon"
                      className="speaker_icon"
                    />
                  )}
                </button>

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
                {/* Display the running time when questions are generated */}
                {isQuestionGenerated && (
                  <div className="timer-display">
                    <p>Total Time: {formatTime(totalTime)}</p>
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