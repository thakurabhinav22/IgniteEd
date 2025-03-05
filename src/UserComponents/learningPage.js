import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import "./learningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, set, update, increment } from "firebase/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";
import Loading from "../icons/Loading.gif";
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
  const [isModuleCompleted, setIsModuleCompleted] = useState(false);
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuestionGenerated, setIsQuestionGenerated] = useState(false);
  const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);
  const [popupWindow, setPopupWindow] = useState(null);
  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const [popupLock, setPopupLock] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [attempts, setAttempts] = useState(0); // Track attempts per module
  const [userName, setUserName] = useState(""); // Store user's full name (Name + Surname)
  const [userBranch, setUserBranch] = useState(""); // Store user's branch

  const db = getDatabase();
  const courseRef = ref(db, `Courses/${courseId}`);
  const ADMIN_ID = "nGqjgrZkivSrNsTfW5l2X1YLJlw1";

  // Timer functions
  const startTimer = () => {
    if (!timerInterval) {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    }
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const storeLearningMetrics = async (userId, courseId, metrics) => {
    const courseProgressRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
    try {
      await update(courseProgressRef, metrics);
      console.log("Learning metrics stored successfully");
      // Reflect changes in admin database
      await storeAdminStats(userId, courseId, currentModule);
    } catch (error) {
      console.error("Error storing learning metrics:", error);
    }
  };

  const storeAdminAppliedStudent = async (userId, courseId, name, branch) => {
    const adminRef = ref(db, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}`);
    const studentData = {
      Name: name,
      Branch: branch,
      atModule: 1,
      status: "applied",
      stats: {
        currentModule: 1,
        totalWarning: 0,
        CriticalWarning: 0,
        moduleDetails: {},
      },
    };
    try {
      await set(adminRef, studentData);
      console.log("Student applied data stored in admin successfully");
    } catch (error) {
      console.error("Error storing admin applied student data:", error);
    }
  };

  const updateAdminAppliedStudent = async (userId, courseId, currentModule) => {
    const adminRef = ref(db, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}`);
    const updateData = {
      atModule: currentModule,
    };
    try {
      await update(adminRef, updateData);
      console.log("Admin applied student data updated successfully");
    } catch (error) {
      console.error("Error updating admin applied student data:", error);
    }
  };

  const storeAdminStats = async (userId, courseId, moduleNumber) => {
    const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
    const adminStatsRef = ref(db, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}/stats`);
    try {
      const userSnapshot = await get(userCourseRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const statsData = {
          currentModule: userData.CurrentModule || 1,
          totalWarning: userData.Warning || 0,
          CriticalWarning: userData.CriticalWarning || 0,
          moduleDetails: {
            [`module${moduleNumber}`]: userData.moduleDetail[`module${moduleNumber}`] || {
              timeTaken: 0,
              totalAttempts: 0,
              totalWarning: 0,
            },
          },
        };
        await update(adminStatsRef, statsData);
        console.log("Admin stats updated successfully");
        // Update appliedStuds with current module
        await updateAdminAppliedStudent(userId, courseId, userData.CurrentModule || 1);
      }
    } catch (error) {
      console.error("Error storing admin stats:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const showPopup = useCallback((title, text, icon) => {
    if (!popupLock) {
      setPopupLock(true);
      Swal.fire({
        title,
        text,
        icon,
        confirmButtonText: "Okay",
      }).then(() => setPopupLock(false));
    }
  }, [popupLock]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      const userId = getUserIdFromCookie();
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

        if (userId) {
          const metricsData = {
            Warning: increment(1),
            CriticalWarning: increment(1),
            moduleDetail: {
              [`module${currentModule}`]: {
                totalWarning: increment(1),
                timestamp: new Date().toISOString(),
              },
            },
          };
          await storeLearningMetrics(userId, courseId, metricsData);
        }

        stopTimer();
        setShowQuestions(false);
        generateQuestions(currentModule);
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
            setModuleLength(JSON.parse(courseData.courseContent).noOfModules || 3);
          } else {
            alert("Course not found.");
          }
        })
        .catch((error) => {
          alert("Error fetching course data: " + error.message);
        });
    }

    const handleMouseLeave = async (event) => {
      const userId = getUserIdFromCookie();
      if (event.clientY < 10 && !isQuestionAnswered && isQuestionGenerated) {
        Swal.fire({
          title: "You cannot Leave the Page",
          text: "You haven't answered the question. Warning has been recorded.",
          icon: "warning",
        });

        if (userId) {
          const metricsData = {
            Warning: increment(1),
            moduleDetail: {
              [`module${currentModule}`]: {
                totalWarning: increment(1),
                timestamp: new Date().toISOString(),
              },
            },
          };
          await storeLearningMetrics(userId, courseId, metricsData);
        }
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
    return cookieValue ? cookieValue.split("=")[1] : null;
  };

  useEffect(() => {
    const userId = getUserIdFromCookie();
    if (userId) {
      const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
      const userRef = ref(db, `user/${userId}`);
      const CourseRef = ref(db, `Courses/${courseId}`);
      get(userCourseRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setIsAlreadyApplied(true);
          setContentVisible(false);
          setCurrentModule(userData.CurrentModule || 1);
          setModuleLength(userData.TotalModules || 3);
          setIsCourseCompleted(userData.completed || false);
          if (userData.moduleDetail && userData.moduleDetail[`module${userData.CurrentModule}`]) {
            setAttempts(userData.moduleDetail[`module${userData.CurrentModule}`].totalAttempts || 0);
          }
        }
      });
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserName(`${userData.Name || "Unknown"} ${userData.Surname || ""}`.trim());
          setUserBranch(userData.Branch || "Unknown");
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

  const handleApplyClick = async () => {
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
      noOfQuestion: 3,
      ModuleCovered: 0,
      TotalModules: JSON.parse(courseDetails.courseContent).noOfModules || 0,
      Warning: 0,
      CriticalWarning: 0,
      CurrentModule: 1,
      completed: false,
      moduleDetail: {},
    };

    try {
      await set(userCourseRef, courseData);
      await storeAdminAppliedStudent(userId, courseId, userName, userBranch);
      alert("You have successfully applied for this course!");
      setIsAlreadyApplied(true);
      setContentVisible(false);
    } catch (error) {
      console.error("Error applying for the course: ", error);
      alert("An error occurred while applying for the course. Please try again.");
    }
  };

  const handlePrevious = async () => {
    if (currentModule === 1) {
      setContentVisible(true);
      return;
    }
    const prevModule = currentModule - 1;
    setCurrentModule(prevModule);
    setIsModuleCompleted(false);
    setShowQuestions(false);
    setIsQuestionGenerated(false);
    setIsQuestionAnswered(false);
    setAttempts(0);
    const userId = getUserIdFromCookie();
    if (userId) {
      const userCourseRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
      await update(userCourseRef, { CurrentModule: prevModule });
      await storeAdminStats(userId, courseId, currentModule); // Reflect change in admin stats
      get(ref(db, `user/${userId}/InProgressCourses/${courseId}/moduleDetail/module${prevModule}`)).then((snapshot) => {
        if (snapshot.exists()) {
          setAttempts(snapshot.val().totalAttempts || 0);
        }
      });
    }
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
              "question": "Question Should be Based on Content only",
              "options": [
                { "option": "Option A", "isCorrect": true },
                { "option": "Option B", "isCorrect": false },
                { "option": "Option C", "isCorrect": false },
                { "option": "Option D", "isCorrect": false }
              ]
            }, etc ....
          ]
        }
        Content:
          Title: ${JSON.parse(courseDetails.courseContent)[`moduletitle${moduleNumber}`]}
          Concept: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}concept`]}
          Example and Analogy: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}ExampleandAnalogy`]}
      `);
      const response = await result.response;
      const generatedQuestions = JSON.parse(response.text().replace("```json", "").replace("```", ""));
      setAiQuestions(generatedQuestions.questions);
      setIsGenerating(false);
      setIsQuestionGenerated(true);
      setTimer(0);
      startTimer();
      Swal.fire({
        title: "Questions Generated!",
        icon: "success",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
      setShowQuestions(true);
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the questions.",
        icon: "error",
      });
      setIsGenerating(false);
    }
  };

  const handleQuestionValidate = async () => {
    let correctAnswersCount = 0;
    const userId = getUserIdFromCookie();
    setAttempts((prev) => prev + 1);

    aiQuestions.forEach((question, index) => {
      const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
      if (selectedOption) {
        const userAnswer = selectedOption.value;
        const correctOption = question.options.find((option) => option.isCorrect).option;
        if (userAnswer === correctOption) {
          correctAnswersCount++;
        }
      }
    });

    const totalQuestions = aiQuestions.length;
    const score = (correctAnswersCount / totalQuestions) * 100;

    if (userId) {
      const metricsData = {
        moduleDetail: {
          [`module${currentModule}`]: {
            totalAttempts: attempts + 1,
            ...(score === 100 && { timeTaken: timer }),
          },
        },
      };
      await storeLearningMetrics(userId, courseId, metricsData);
    }

    if (score === 100) {
      stopTimer();
      Swal.fire({
        title: "Perfect Score!",
        text: `You got all ${totalQuestions} questions correct in ${formatTime(timer)}!`,
        icon: "success",
        confirmButtonText: "OK",
      });
      setIsQuestionAnswered(true);
      setIsModuleCompleted(true);
      setShowQuestions(false);
      setIsQuestionGenerated(false);
      setAttempts(0);
    } else {
      Swal.fire({
        title: `Score: ${score}%`,
        text: `You got ${correctAnswersCount} out of ${totalQuestions} correct. Please try again to get all answers correct.`,
        icon: "error",
        confirmButtonText: "OK",
      });
      document.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.checked = false;
      });
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

    if (currentModule === moduleLength && isCourseCompleted) {
      setIsCourseCompleted(true);
      return;
    }

    const userCookie = getUserIdFromCookie();
    const moduleRef = ref(db, `user/${userCookie}/InProgressCourses/${courseId}`);

    if (!isModuleCompleted) {
      generateQuestions(currentModule);
      return;
    }

    const nextModule = currentModule + 1;
    setCurrentModule(nextModule);
    setIsModuleCompleted(false);
    setShowQuestions(false);
    setIsQuestionGenerated(false);
    setIsQuestionAnswered(false);
    setAttempts(0);

    try {
      await update(moduleRef, {
        ModuleCovered: nextModule,
        CurrentModule: nextModule,
      });
      if (nextModule === moduleLength) {
        await update(moduleRef, { completed: true });
        setIsCourseCompleted(true);
      }
      await storeAdminStats(userCookie, courseId, currentModule - 1); // Store stats for the just-completed module
    } catch (error) {
      console.error("Error updating user progress:", error);
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
                    <h1 className="learning-title">{courseDetails.courseName}</h1>
                    <div className="course-info">
                      <div className="course-section">
                        <h2>Introduction</h2>
                        <p>
                          {courseDetails.courseContent &&
                            JSON.parse(courseDetails.courseContent).Introduction}
                        </p>
                        <button className="apply-button" onClick={handleApplyClick}>
                          Apply for Course
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="loading-container">
                    <img src={Loading} className="loading-gif" alt="Loading" />
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
                    <img src={speaker} alt="Speaker Icon" className="speaker_icon" />
                  ) : (
                    <img src={speaking} alt="Speaking Icon" className="speaker_icon" />
                  )}
                </button>

                <h2>Module {currentModule}</h2>
                <h2>{JSON.parse(courseDetails.courseContent)[`moduletitle${currentModule}`]}</h2>
                <h2>Concept</h2>
                <p>{JSON.parse(courseDetails.courseContent)[`module${currentModule}concept`]}</p>
                <h2>Example and Analogy</h2>
                <p>{JSON.parse(courseDetails.courseContent)[`module${currentModule}ExampleandAnalogy`]}</p>
                {showQuestions && (
                  <div className="question-course-info">
                    <p>Time: {formatTime(timer)}</p>
                    <h2>Answer the Questions</h2>
                    {aiQuestions.map((question, index) => (
                      <div key={index} className="question-course-section">
                        <h3>{index + 1}. {question.question}</h3>
                        <div className="options-container">
                          {question.options.map((option, optionIndex) => (
                            <label key={optionIndex}>
                              <input
                                type="radio"
                                value={option.option}
                                name={`question-${index}`}
                              />
                              <span className="option-label">{option.option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button className="NextQuestion" onClick={handleQuestionValidate}>
                      Submit
                    </button>
                  </div>
                )}
                <div>
                  <button
                    className="previous-button"
                    onClick={handlePrevious}
                    style={{
                      display: isQuestionGenerated || currentModule === 1 ? "none" : "inline-block",
                    }}
                  >
                    Previous
                  </button>
                  <button
                    className="next-button"
                    onClick={handleNext}
                    style={{
                      display:
                        isQuestionGenerated || (currentModule === moduleLength && isCourseCompleted)
                          ? "none"
                          : "inline-block",
                    }}
                  >
                    {currentModule === moduleLength ? "Complete" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LearningPage;