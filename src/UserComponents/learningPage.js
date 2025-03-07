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
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [userName, setUserName] = useState("");
  const [userBranch, setUserBranch] = useState("");
  const [warningCount, setWarningCount] = useState(0);
  const [criticalWarningCount, setCriticalWarningCount] = useState(0);
  const [moduleNumber, setModuleNumber] = useState(1);
  const [averageTimeTaken, setAverageTimeTaken] = useState(0); // New state for average time

  const db = getDatabase();
  const courseRef = ref(db, `Courses/${courseId}`);
  const ADMIN_ID = "nGqjgrZkivSrNsTfW5l2X1YLJlw1";
  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getUserIdFromCookie = () => {
    const cookieValue = document.cookie.split("; ").find((row) => row.startsWith("userSessionCred="));
    return cookieValue ? cookieValue.split("=")[1] : null;
  };

  // Stores metrics for the user, including stats, under InProgressCourses
  const storeLearningMetrics = async (userId, courseId, metrics) => {
    const courseProgressRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);
    try {
      // Fetch current data to calculate the average
      const snapshot = await get(courseProgressRef);
      const currentData = snapshot.exists() ? snapshot.val() : { stats: { moduleDetails: {}, totalTimeTaken: 0 } };

      // Calculate total time taken and number of modules with time recorded
      const moduleDetails = currentData.stats?.moduleDetails || {};
      const newModuleDetails = { ...moduleDetails, ...metrics.stats.moduleDetails };
      const totalTimeTaken = Object.values(newModuleDetails).reduce((sum, module) => sum + (module.timeTaken || 0), 0);
      const completedModulesCount = Object.keys(newModuleDetails).length;
      const averageTimeTaken = completedModulesCount > 0 ? totalTimeTaken / completedModulesCount : 0;

      // Update Firebase with the new metrics, total time, and average time
      await update(courseProgressRef, {
        ...metrics,
        stats: {
          ...metrics.stats,
          totalTimeTaken: totalTimeTaken,
          averageTimeTaken: averageTimeTaken,
        },
      });
      console.log("Learning metrics stored successfully with average time");
      setAverageTimeTaken(averageTimeTaken); // Update state for UI display
    } catch (error) {
      console.error("Error storing learning metrics:", error);
    }
  };

  // Initial admin storage for applied student (no stats here anymore)
  const storeAdminAppliedStudent = async (userId, courseId, name, branch) => {
    const adminRef = ref(db, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}`);
    const studentData = {
      Name: name,
      Branch: branch,
      atModule: 1,
      status: "applied",
    };
    try {
      await set(adminRef, studentData);
      console.log("Student applied data stored in admin successfully");
    } catch (error) {
      console.error("Error storing admin applied student data:", error);
    }
  };

  // Updates admin's view of the current module
  const updateAdminAppliedStudent = async (userId, courseId, currentModule) => {
    const adminRef = ref(db, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}`);
    const updateData = { atModule: currentModule };
    try {
      await update(adminRef, updateData);
      console.log("Admin applied student data updated successfully");
    } catch (error) {
      console.error("Error updating admin applied student data:", error);
    }
  };

  // Stores question performance under user's stats
  const storeQuestionPerformance = async (userId, courseId, moduleNumber, performance) => {
    const userStatsRef = ref(db, `user/${userId}/InProgressCourses/${courseId}/stats/performanceAnalysis`);
    try {
      const snapshot = await get(userStatsRef);
      const currentData = snapshot.exists() ? snapshot.val() : {
        understandingScore: 0,
        memoryScore: 0,
        analysisScore: 0,
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
      };

      const newTotalQuestions = currentData.totalQuestionsAnswered + performance.totalQuestions;
      const newCorrectAnswers = currentData.correctAnswers + performance.correctAnswers;
      const accuracy = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : 0;

      const updatedData = {
        understandingScore: currentData.understandingScore + (performance.understandingScore || 0),
        memoryScore: currentData.memoryScore + (performance.memoryScore || 0),
        analysisScore: currentData.analysisScore + (performance.analysisScore || 0),
        totalQuestionsAnswered: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        accuracy: accuracy,
      };

      await update(userStatsRef, updatedData);
      console.log("Question performance stored successfully under user stats");
      await updateAdminAppliedStudent(userId, courseId, currentModule); // Sync atModule
    } catch (error) {
      console.error("Error storing question performance:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // Tracks tab switching and updates warnings
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const userId = getUserIdFromCookie();
      if (document.visibilityState === "hidden" && !isQuestionAnswered && isQuestionGenerated) {
        Swal.fire({
          title: "Critical Warning",
          text: "Our System has detected Tab Switching",
          icon: "error",
          confirmButtonText: "Okay",
        });

        if (userId) {
          setWarningCount((prev) => prev + 1);
          setCriticalWarningCount((prev) => prev + 1);
          const metricsData = {
            Warning: increment(1),
            CriticalWarning: increment(1),
            stats: {
              totalWarning: increment(1),
              criticalWarning: increment(1),
              moduleDetails: {
                [`module${currentModule}`]: {
                  totalWarning: increment(1),
                  timestamp: new Date().toISOString(),
                },
              },
            },
          };
          await storeLearningMetrics(userId, courseId, metricsData);
        }

        stopTimer();
        setShowQuestions(false);
        setIsQuestionGenerated(false);
        setIsQuestionAnswered(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isQuestionAnswered, isQuestionGenerated]);

  // Fetches course data and tracks mouse leave warnings
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
          setWarningCount((prev) => prev + 1);
          const metricsData = {
            Warning: increment(1),
            stats: {
              totalWarning: increment(1),
              moduleDetails: {
                [`module${currentModule}`]: {
                  totalWarning: increment(1),
                  timestamp: new Date().toISOString(),
                },
              },
            },
          };
          await storeLearningMetrics(userId, courseId, metricsData);
        }
      }
    };

    const handleBeforeUnload = (event) => {
      if (!isQuestionAnswered && isQuestionGenerated) {
        const message = "You haven't answered the question. Are you sure you want to leave?";
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener("mouseout", handleMouseLeave);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [courseId, isQuestionAnswered, isQuestionGenerated, navigate]);

  // Loads initial user data
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
          setWarningCount(userData.Warning || 0);
          setCriticalWarningCount(userData.CriticalWarning || 0);
          setAverageTimeTaken(userData.stats?.averageTimeTaken || 0); // Load initial average time
          if (userData.stats && userData.stats.moduleDetails && userData.stats.moduleDetails[`module${userData.CurrentModule}`]) {
            setAttempts(userData.stats.moduleDetails[`module${userData.CurrentModule}`].totalAttempts || 0);
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

  // Handles course application
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
      moduleDetail: {}, // Kept for backward compatibility, but stats will hold detailed data
      stats: {
        currentModule: 1,
        totalWarning: 0,
        criticalWarning: 0,
        totalTimeTaken: 0, // Initialize total time
        averageTimeTaken: 0, // Initialize average time
        moduleDetails: {},
        performanceAnalysis: {
          understandingScore: 0,
          memoryScore: 0,
          analysisScore: 0,
          totalQuestionsAnswered: 0,
          correctAnswers: 0,
          accuracy: 0,
        },
      },
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
      await update(userCourseRef, {
        CurrentModule: prevModule,
        stats: { currentModule: prevModule },
      });
      await updateAdminAppliedStudent(userId, courseId, prevModule);
      get(ref(db, `user/${userId}/InProgressCourses/${courseId}/stats/moduleDetails/module${prevModule}`)).then((snapshot) => {
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
        Generate ${questionCount} questions based on the below content, categorized by Bloom's Taxonomy levels:
        - 1 question at "Remember" level (recall facts),
        - 1 question at "Understand" level (explain concepts),
        - 1 question at "Analyze" level (compare, contrast, or infer).
        Provide 4 options per question in this JSON format:
        {
          "questions": [
            {
              "question": "Question text",
              "type": "Remember|Understand|Analyze",
              "options": [
                { "option": "Option A", "isCorrect": true },
                { "option": "Option B", "isCorrect": false },
                { "option": "Option C", "isCorrect": false },
                { "option": "Option D", "isCorrect": false }
              ]
            }
          ]
        }
        Content:
          Title: ${JSON.parse(courseDetails.courseContent)[`moduletitle${moduleNumber}`]}
          Concept: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}concept`]}
          Example and Analogy: ${JSON.parse(courseDetails.courseContent)[`module${moduleNumber}ExampleandAnalogy`]}
      `);
      const response = await result.response;
      const text = response.text().replace("```json", "").replace("```", "").trim();
      const generatedQuestions = JSON.parse(text);

      if (!generatedQuestions.questions || !Array.isArray(generatedQuestions.questions)) {
        throw new Error("Invalid question format received from AI");
      }

      setAiQuestions(generatedQuestions.questions);
      setIsGenerating(false);
      setIsQuestionGenerated(true);
      setTimer(0);
      startTimer();
      setShowQuestions(true);
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the questions: " + error.message,
        icon: "error",
      });
      setIsGenerating(false);
    }
  };

  // Validates answers and stores metrics
  const handleQuestionValidate = async () => {
    if (!aiQuestions || !Array.isArray(aiQuestions) || aiQuestions.length === 0) {
      Swal.fire({
        title: "Error",
        text: "No questions available to validate. Please generate questions first.",
        icon: "error",
      });
      return;
    }

    let correctAnswersCount = 0;
    const userId = getUserIdFromCookie();
    setAttempts((prev) => prev + 1);

    const performance = {
      understandingScore: 0,
      memoryScore: 0,
      analysisScore: 0,
      totalQuestions: aiQuestions.length,
      correctAnswers: 0,
    };

    aiQuestions.forEach((question, index) => {
      const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
      if (!question.options || !Array.isArray(question.options)) {
        console.error(`Question ${index} has invalid options:`, question);
        return;
      }

      if (selectedOption) {
        const userAnswer = selectedOption.value;
        const correctOptionObj = question.options.find((option) => option.isCorrect);
        const correctOption = correctOptionObj ? correctOptionObj.option : null;

        if (correctOption && userAnswer === correctOption) {
          correctAnswersCount++;
          performance.correctAnswers++;
          switch (question.type) {
            case "Remember":
              performance.memoryScore += 1;
              break;
            case "Understand":
              performance.understandingScore += 1;
              break;
            case "Analyze":
              performance.analysisScore += 1;
              break;
            default:
              break;
          }
        }
      }
    });

    const totalQuestions = aiQuestions.length;
    const score = totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;

    if (userId) {
      const metricsData = {
        moduleDetail: {
          [`module${currentModule}`]: {
            totalAttempts: attempts + 1,
            timeTaken: timer,
            totalWarning: warningCount,
            score: score,
          },
        },
        Warning: warningCount,
        CriticalWarning: criticalWarningCount,
        stats: {
          currentModule: currentModule,
          totalWarning: warningCount,
          criticalWarning: criticalWarningCount,
          moduleDetails: {
            [`module${currentModule}`]: {
              totalAttempts: attempts + 1,
              timeTaken: timer,
              totalWarning: warningCount,
            },
          },
        },
      };
      await storeLearningMetrics(userId, courseId, metricsData);
      await storeQuestionPerformance(userId, courseId, currentModule, performance);
    }

    stopTimer();

    if (score === 100) {
      Swal.fire({
        title: "Perfect Score!",
        text: `You got all ${totalQuestions} questions correct in ${formatTime(timer)}! Moving to the next module.`,
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        handleNextModule();
      });
    } else if (score >= 60) {
      Swal.fire({
        title: `Good Job! Score: ${score}%`,
        text: `You got ${correctAnswersCount} out of ${totalQuestions} correct. Moving to the next module.`,
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        handleNextModule();
      });
    } else if (score > 0) {
      Swal.fire({
        title: `Score: ${score}%`,
        text: `You got ${correctAnswersCount} out of ${totalQuestions} correct. Please try again to achieve at least 60%.`,
        icon: "error",
        confirmButtonText: "OK",
      });
      document.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.checked = false;
      });
      setShowQuestions(false);
      setIsQuestionGenerated(false);
      setIsQuestionAnswered(false);
    } else {
      Swal.fire({
        title: "Score: 0%",
        text: "You got all answers incorrect or did not select any answers. Please review the material and click 'Next' to retry.",
        icon: "error",
        confirmButtonText: "OK",
      });
      setAiQuestions([]);
      setShowQuestions(false);
      setIsQuestionGenerated(false);
      setIsQuestionAnswered(false);
    }
  };

  // Advances to next module and updates completion status
  const handleNextModule = async () => {
    const userId = getUserIdFromCookie();
    const moduleRef = ref(db, `user/${userId}/InProgressCourses/${courseId}`);

    if (currentModule === moduleLength) {
      await update(moduleRef, { completed: true });
      setIsCourseCompleted(true);
      Swal.fire({
        title: "Course Completed!",
        text: "Congratulations on completing the course!",
        icon: "success",
        confirmButtonText: "OK",
      });
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
        stats: { currentModule: nextModule },
      });
      await updateAdminAppliedStudent(userId, courseId, nextModule);
    } catch (error) {
      console.error("Error updating user progress:", error);
    }
  };

  const showTestRulesAndGenerateQuestions = async () => {
    Swal.fire({
      title: "Test Rules",
      html: `
        <ul style="text-align: left;">
          <li>Answer all questions to the best of your ability.</li>
          <li>You need at least 60% to proceed to the next module.</li>
          <li>Tab switching or leaving the page will result in a warning.</li>
          <li>Review the material if you score below 60%.</li>
        </ul>
      `,
      icon: "info",
      confirmButtonText: "Start Test",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        await generateQuestions(currentModule);
      },
    });
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
      return;
    }

    if (!isModuleCompleted) {
      await showTestRulesAndGenerateQuestions();
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
      <Sidebar isQuestionAnswered={isQuestionAnswered} isQuestionGenerated={isQuestionGenerated} />
      <div className="learning-content">
        {contentVisible ? (
          <>
            {isAlreadyApplied ? (
              <div className="empty-content">
                <h2>Thank you for applying!</h2>
                <p>
                  You have already enrolled in this course. You will receive further instructions in your registered email.
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
                          {courseDetails.courseContent && JSON.parse(courseDetails.courseContent).Introduction}
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
                <p>{JSON.parse(courseDetails.courseContent)[`module${moduleNumber}ExampleandAnalogy`]}</p>
                <p>Average Time Taken Per Module: {formatTime(Math.round(averageTimeTaken))}</p>
                {showQuestions && (
                  <div className="question-course-info">
                    <p>Time: {formatTime(timer)}</p>
                    <h2>Answer the Questions</h2>
                    {aiQuestions.map((question, index) => (
                      <div key={index} className="question-course-section">
                        <h3>{index + 1}. {question.question} ({question.type})</h3>
                        <div className="options-container">
                          {question.options && question.options.map((option, optionIndex) => (
                            <label key={optionIndex}>
                              <input type="radio" value={option.option} name={`question-${index}`} />
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