import React, { useEffect, useState, useRef } from "react";
import Sidebar from "./Sidebar";
import "./learningPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  increment,
} from "firebase/database";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";
import Loading from "../icons/Loading.gif";
import speaker from "../icons/speaker.png";
import speaking from "../icons/speaking.gif";
import Modal from "react-modal";
import * as d3 from "d3";
import { render } from "d3-graphviz";

// Bind modal to the app element (for accessibility)
Modal.setAppElement("#root");

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
  const [isAssessmentCompleted, setIsAssessmentCompleted] = useState(false);
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
  const [preferredVoice, setPreferredVoice] = useState("microsoft-david");
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const mindMapRef = useRef(null);

  const db = getDatabase();
  const courseRef = ref(db, `Courses/${courseId}`);
  const ADMIN_ID = "nGqjgrZkivSrNsTfW5l2X1YLJlw1";
  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Function to bold "data" in text and handle ** markers for bolding
  const boldData = (text) => {
    if (!text || typeof text !== "string") return text;

    let parts = [text];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let result = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index));
      }
      result.push(<strong key={match.index}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    if (result.length === 0) {
      result = [text];
    }

    return result.map((part, index) => {
      if (typeof part !== "string") {
        return part;
      }
      const dataParts = part.split(/(\bdata\b)/gi);
      return dataParts.map((subPart, subIndex) =>
        subPart.toLowerCase() === "data" ? (
          <strong key={`${index}-${subIndex}`}>{subPart}</strong>
        ) : (
          <span key={`${index}-${subIndex}`}>{subPart}</span>
        )
      );
    });
  };

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

  const getUserIdFromCookie = () => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("userSessionCred="));
    return cookieValue ? cookieValue.split("=")[1] : null;
  };

  const updateUserAnalytics = async (
    userId,
    performance = {},
    isCompleted = false,
    isNewCourse = false
  ) => {
    const analyticsRef = ref(db, `user/${userId}/analytics`);
    try {
      const analyticsSnapshot = await get(analyticsRef);
      let currentAnalytics = analyticsSnapshot.exists()
        ? analyticsSnapshot.val()
        : {
            memoryScore: 0,
            analysisScore: 0,
            understandingScore: 0,
            totalCoursesApplied: 0,
            totalCoursesCompleted: 0,
          };

      const updatedAnalytics = {
        memoryScore:
          (currentAnalytics.memoryScore || 0) + (performance.memoryScore || 0),
        analysisScore:
          (currentAnalytics.analysisScore || 0) +
          (performance.analysisScore || 0),
        understandingScore:
          (currentAnalytics.understandingScore || 0) +
          (performance.understandingScore || 0),
        totalCoursesApplied: isNewCourse
          ? (currentAnalytics.totalCoursesApplied || 0) + 1
          : currentAnalytics.totalCoursesApplied || 0,
        totalCoursesCompleted: isCompleted
          ? (currentAnalytics.totalCoursesCompleted || 0) + 1
          : currentAnalytics.totalCoursesCompleted || 0,
      };

      await set(analyticsRef, updatedAnalytics);
      console.log("Updated user analytics:", updatedAnalytics);
    } catch (error) {
      console.error("Error updating user analytics:", error);
    }
  };

  const storeUserCourseStats = async (
    userId,
    courseId,
    moduleNumber,
    performance = {}
  ) => {
    const userCourseRef = ref(
      db,
      `user/${userId}/InProgressCourses/${courseId}`
    );
    try {
      const userSnapshot = await get(userCourseRef);
      let currentData = userSnapshot.exists()
        ? userSnapshot.val()
        : {
            noOfQuestion: 3,
            ModuleCovered: 0,
            TotalModules: moduleLength,
            Warning: 0,
            CriticalWarning: 0,
            CurrentModule: 1,
            completed: false,
            moduleDetail: {},
            performanceAnalysis: {
              understandingScore: 0,
              memoryScore: 0,
              analysisScore: 0,
              totalQuestionsAnswered: 0,
              correctAnswers: 0,
              accuracy: 0,
            },
          };

      const newTotalQuestions =
        (currentData.performanceAnalysis?.totalQuestionsAnswered || 0) +
        (performance.totalQuestions || 0);
      const newCorrectAnswers =
        (currentData.performanceAnalysis?.correctAnswers || 0) +
        (performance.correctAnswers || 0);
      const accuracy =
        newTotalQuestions > 0
          ? (newCorrectAnswers / newTotalQuestions) * 100
          : 0;

      const statsData = {
        CurrentModule:
          performance.CurrentModule !== undefined
            ? performance.CurrentModule
            : currentModule,
        ModuleCovered:
          performance.ModuleCovered !== undefined
            ? performance.ModuleCovered
            : currentData.ModuleCovered || 0,
        TotalModules: moduleLength,
        Warning:
          performance.totalWarning !== undefined
            ? performance.totalWarning
            : warningCount,
        CriticalWarning:
          performance.criticalWarning !== undefined
            ? performance.criticalWarning
            : criticalWarningCount,
        completed:
          performance.completed !== undefined
            ? performance.completed
            : currentData.completed || false,
        moduleDetail: performance.moduleDetail || {
          ...currentData.moduleDetail,
          [`module${moduleNumber}`]: {
            timeTaken:
              performance.timeTaken ||
              currentData.moduleDetail?.[`module${moduleNumber}`]?.timeTaken ||
              0,
            totalAttempts:
              performance.totalAttempts ||
              currentData.moduleDetail?.[`module${moduleNumber}`]
                ?.totalAttempts ||
              0,
            totalWarning:
              performance.totalWarning ||
              currentData.moduleDetail?.[`module${moduleNumber}`]
                ?.totalWarning ||
              0,
            score:
              performance.score ||
              currentData.moduleDetail?.[`module${moduleNumber}`]?.score ||
              0,
          },
        },
        performanceAnalysis: {
          understandingScore:
            (currentData.performanceAnalysis?.understandingScore || 0) +
            (performance.understandingScore || 0),
          memoryScore:
            (currentData.performanceAnalysis?.memoryScore || 0) +
            (performance.memoryScore || 0),
          analysisScore:
            (currentData.performanceAnalysis?.analysisScore || 0) +
            (performance.analysisScore || 0),
          totalQuestionsAnswered: newTotalQuestions,
          correctAnswers: newCorrectAnswers,
          accuracy: accuracy,
        },
      };

      await update(userCourseRef, statsData);
      console.log("Stored user course stats:", statsData);

      await syncAdminStats(userId, courseId, statsData);
      await updateUserAnalysisScores(userId, {
        understandingScore: performance.understandingScore || 0,
        memoryScore: performance.memoryScore || 0,
        analysisScore: performance.analysisScore || 0,
      });

      await updateUserAnalytics(
        userId,
        {
          understandingScore: performance.understandingScore || 0,
          memoryScore: performance.memoryScore || 0,
          analysisScore: performance.analysisScore || 0,
        },
        statsData.completed
      );

      return true;
    } catch (error) {
      console.error("Error storing user course stats:", error);
      throw error;
    }
  };

  const updateUserAnalysisScores = async (userId, scores) => {
    const userRef = ref(db, `user/${userId}`);
    try {
      const userSnapshot = await get(userRef);
      let currentUserData = userSnapshot.exists()
        ? userSnapshot.val()
        : {
            understandingScore: 0,
            memoryScore: 0,
            analysisScore: 0,
          };

      const updatedScores = {
        understandingScore:
          (currentUserData.understandingScore || 0) + scores.understandingScore,
        memoryScore: (currentUserData.memoryScore || 0) + scores.memoryScore,
        analysisScore:
          (currentUserData.analysisScore || 0) + scores.analysisScore,
      };

      await update(userRef, updatedScores);
      console.log("Updated user analysis scores:", updatedScores);
    } catch (error) {
      console.error("Error updating user analysis scores:", error);
    }
  };

  const syncAdminStats = async (userId, courseId, userStats) => {
    const adminStatsRef = ref(
      db,
      `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}`
    );
    try {
      const adminSnapshot = await get(adminStatsRef);
      let adminData = adminSnapshot.exists()
        ? adminSnapshot.val()
        : {
            Name: userName,
            Branch: userBranch,
            atModule: 1,
            status: "applied",
            courseComplete: false, // Added courseComplete field
            stats: {
              currentModule: 1,
              totalWarning: 0,
              criticalWarning: 0,
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

      const adminStats = {
        ...adminData,
        atModule: userStats.CurrentModule,
        courseComplete: userStats.completed, // Update courseComplete based on userStats
        stats: {
          currentModule: userStats.CurrentModule,
          totalWarning: userStats.Warning,
          criticalWarning: userStats.CriticalWarning,
          moduleDetails: userStats.moduleDetail,
          performanceAnalysis: userStats.performanceAnalysis,
        },
      };

      await set(adminStatsRef, adminStats);
      console.log("Synced admin stats:", adminStats);
    } catch (error) {
      console.error("Error syncing admin stats:", error);
    }
  };

  const storeAdminAppliedStudent = async (userId, courseId, name, branch) => {
    const adminRef = ref(
      db,
      `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${userId}`
    );
    const studentData = {
      Name: name,
      Branch: branch,
      atModule: 1,
      status: "applied",
      courseComplete: false, // Initialize courseComplete as false
      stats: {
        currentModule: 1,
        totalWarning: 0,
        criticalWarning: 0,
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
      await set(adminRef, studentData);
      console.log("Student applied data stored in admin:", studentData);
    } catch (error) {
      console.error("Error storing admin applied student data:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

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
          setWarningCount((prev) => prev + 1);
          setCriticalWarningCount((prev) => prev + 1);
          const performanceData = {
            totalWarning: warningCount + 1,
            criticalWarning: criticalWarningCount + 1,
            understandingScore: 0,
            memoryScore: 0,
            analysisScore: 0,
            totalQuestions: 0,
            correctAnswers: 0,
          };
          await storeUserCourseStats(
            userId,
            courseId,
            currentModule,
            performanceData
          );
        }

        stopTimer();
        setShowQuestions(false);
        setIsQuestionGenerated(false);
        setIsQuestionAnswered(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    courseId,
    isQuestionAnswered,
    isQuestionGenerated,
    currentModule,
    warningCount,
    criticalWarningCount,
  ]);

  useEffect(() => {
    if (!courseId) {
      navigate(`/courses`);
      return;
    }

    get(courseRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const courseData = snapshot.val();
          setCourseDetails(courseData);
          setModuleLength(
            JSON.parse(courseData.courseContent).noOfModules || 3
          );
        } else {
          alert("Course not found.");
        }
      })
      .catch((error) => {
        alert("Error fetching course data: " + error.message);
      });

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
          const performanceData = {
            totalWarning: warningCount + 1,
            criticalWarning: criticalWarningCount,
            understandingScore: 0,
            memoryScore: 0,
            analysisScore: 0,
            totalQuestions: 0,
            correctAnswers: 0,
          };
          await storeUserCourseStats(
            userId,
            courseId,
            currentModule,
            performanceData
          );
        }
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

    window.addEventListener("mouseout", handleMouseLeave);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("mouseout", handleMouseLeave);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    courseId,
    isQuestionAnswered,
    isQuestionGenerated,
    currentModule,
    warningCount,
    criticalWarningCount,
  ]);

  useEffect(() => {
    const userId = getUserIdFromCookie();
    if (userId) {
      const userCourseRef = ref(
        db,
        `user/${userId}/InProgressCourses/${courseId}`
      );
      const userRef = ref(db, `user/${userId}`);
      const CourseRef = ref(db, `Courses/${courseId}`);
      const assessmentRef = ref(
        db,
        `users/${userId}/${courseId}/assessmentComplete`
      );

      get(userCourseRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setIsAlreadyApplied(true);
            setContentVisible(false);
            const savedModule = userData.CurrentModule || 1;
            setCurrentModule(savedModule);
            setModuleLength(userData.TotalModules || 3);
            setIsCourseCompleted(userData.completed || false);
            setWarningCount(userData.Warning || 0);
            setCriticalWarningCount(userData.CriticalWarning || 0);

            if (
              userData.moduleDetail &&
              userData.moduleDetail[`module${savedModule}`]
            ) {
              setAttempts(
                userData.moduleDetail[`module${savedModule}`].totalAttempts || 0
              );
              setIsModuleCompleted(
                userData.moduleDetail[`module${savedModule}`].score >= 60
              );
            } else {
              setIsModuleCompleted(false);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching user course data:", error);
        });

      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserName(
            `${userData.Name || "Unknown"} ${userData.Surname || ""}`.trim()
          );
          setUserBranch(userData.Branch || "Unknown");
          if (userData.PrefferedAudio) {
            setPreferredVoice(userData.PrefferedAudio);
          }
        }
      });

      get(CourseRef).then((snapshot) => {
        if (snapshot.exists()) {
          const CourseData = snapshot.val();
          setQuestionCount(CourseData.numQuestions || 3);
        }
      });

      get(assessmentRef).then((snapshot) => {
        if (snapshot.exists() && snapshot.val() === true) {
          setIsAssessmentCompleted(true);
        } else {
          setIsAssessmentCompleted(false);
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
    const userCourseRef = ref(
      db,
      `user/${userId}/InProgressCourses/${courseId}`
    );
    const courseData = {
      noOfQuestion: 3,
      ModuleCovered: 0,
      TotalModules: JSON.parse(courseDetails.courseContent).noOfModules || 0,
      Warning: 0,
      CriticalWarning: 0,
      CurrentModule: 1,
      completed: false,
      moduleDetail: {},
      performanceAnalysis: {
        understandingScore: 0,
        memoryScore: 0,
        analysisScore: 0,
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
      },
    };

    try {
      await set(userCourseRef, courseData);
      await storeAdminAppliedStudent(userId, courseId, userName, userBranch);
      await updateUserAnalytics(userId, {}, false, true);
      alert("You have successfully applied for this course!");
      setIsAlreadyApplied(true);
      setContentVisible(false);
      setCurrentModule(1);
    } catch (error) {
      console.error("Error applying for the course: ", error);
      alert(
        "An error occurred while applying for the course. Please try again."
      );
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
      const performanceData = {
        totalWarning: warningCount,
        criticalWarning: criticalWarningCount,
        understandingScore: 0,
        memoryScore: 0,
        analysisScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        CurrentModule: prevModule,
      };
      await storeUserCourseStats(userId, courseId, prevModule, performanceData);
      get(
        ref(
          db,
          `user/${userId}/InProgressCourses/${courseId}/moduleDetail/module${prevModule}`
        )
      ).then((snapshot) => {
        if (snapshot.exists()) {
          setAttempts(snapshot.val().totalAttempts || 0);
          setIsModuleCompleted(snapshot.val().score >= 60);
        } else {
          setIsModuleCompleted(false);
        }
      });
    }
  };

  const generateQuestions = async (moduleNumber) => {
    setIsGenerating(true);
    try {
      const parsedContent = JSON.parse(courseDetails.courseContent);
      const module = parsedContent.modules[moduleNumber - 1];
      const result = await model.generateContent(`
        ${console.log(questionCount)}
        Generate ${questionCount} questions based on the below content, categorized by Bloom's Taxonomy levels:
        - 1 question at "Remember" level (recall facts) [ Keep all option length same to create a doubt among options],
        - 1 question at "Understand" level (explain concepts)  [ Keep all option length same to create a doubt among options],
        - 1 question at "Analyze" level (compare, contrast, or infer)  [ Keep all option length same to create a doubt among options].
      
        Follow these guidelines for generating questions and options:
        1. Ensure the correct answer is not always the first option.
        2. Vary the length and complexity of the options to make them look realistic.
        3. Include at least one option that is partially correct but not the best answer.
        4. Ensure the options are plausible and relevant to the question.
        5. Keep all option lengths similar to create doubt among options
      
        Provide the output in this JSON format:
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
          Title: ${module.moduleTitle}
          Overview: ${module.moduleOverview}
          Detailed Explanation: ${module.detailedExplanation}
          Examples and Analogies: ${module.examplesAndAnalogies}
          Key Takeaways: ${module.keyTakeaways.join(", ")}
      `);
      const response = await result.response;
      const text = response
        .text()
        .replace("```json", "")
        .replace("```", "")
        .trim();
      const generatedQuestions = JSON.parse(text);

      if (
        !generatedQuestions.questions ||
        !Array.isArray(generatedQuestions.questions)
      ) {
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
        text:
          "An error occurred while generating the questions: " + error.message,
        icon: "error",
      });
      setIsGenerating(false);
    }
  };

  const handleQuestionValidate = async () => {
    if (
      !aiQuestions ||
      !Array.isArray(aiQuestions) ||
      aiQuestions.length === 0
    ) {
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
      const selectedOption = document.querySelector(
        `input[name="question-${index}"]:checked`
      );
      if (!question.options || !Array.isArray(question.options)) {
        console.error(`Question ${index} has invalid options:`, question);
        return;
      }

      if (selectedOption) {
        const userAnswer = selectedOption.value;
        const correctOptionObj = question.options.find(
          (option) => option.isCorrect
        );
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
    const score =
      totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;

    if (userId) {
      const performanceData = {
        timeTaken: timer,
        totalAttempts: attempts + 1,
        totalWarning: warningCount,
        criticalWarning: criticalWarningCount,
        score: score,
        understandingScore: performance.understandingScore,
        memoryScore: performance.memoryScore,
        analysisScore: performance.analysisScore,
        totalQuestions: totalQuestions,
        correctAnswers: performance.correctAnswers,
        ModuleCovered:
          currentModule >= moduleLength ? moduleLength : currentModule,
        CurrentModule: currentModule,
      };
      await storeUserCourseStats(
        userId,
        courseId,
        currentModule,
        performanceData
      );
    }

    stopTimer();

    if (score >= 60) {
      setIsModuleCompleted(true);
      Swal.fire({
        title: score === 100 ? "Perfect Score!" : `Good Job! Score: ${score}%`,
        text: `You got ${correctAnswersCount} out of ${totalQuestions} correct in ${formatTime(
          timer
        )}! Moving to the next module...`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        if (currentModule === moduleLength) {
          handleNextModule();
        } else {
          handleNextModule();
        }
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

  const handleNextModule = async () => {
    const userId = getUserIdFromCookie();
    if (!userId) return;

    if (currentModule === moduleLength) {
      const userCourseRef = ref(
        db,
        `user/${userId}/InProgressCourses/${courseId}`
      );
      const userSnapshot = await get(userCourseRef);
      let currentData = userSnapshot.exists()
        ? userSnapshot.val()
        : {
            noOfQuestion: 3,
            ModuleCovered: 0,
            TotalModules: moduleLength,
            Warning: 0,
            CriticalWarning: 0,
            CurrentModule: 1,
            completed: false,
            moduleDetail: {},
            performanceAnalysis: {
              understandingScore: 0,
              memoryScore: 0,
              analysisScore: 0,
              totalQuestionsAnswered: 0,
              correctAnswers: 0,
              accuracy: 0,
            },
          };

      const updatedModuleDetail = { ...currentData.moduleDetail };
      for (let i = 1; i <= moduleLength; i++) {
        if (!updatedModuleDetail[`module${i}`]) {
          updatedModuleDetail[`module${i}`] = {
            timeTaken: 0,
            totalAttempts: 0,
            totalWarning: 0,
            score: 0,
          };
        }
      }

      const performanceData = {
        totalWarning: warningCount,
        criticalWarning: criticalWarningCount,
        understandingScore: 0,
        memoryScore: 0,
        analysisScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        ModuleCovered: moduleLength,
        CurrentModule: moduleLength,
        completed: true,
        moduleDetail: updatedModuleDetail,
      };

      await storeUserCourseStats(
        userId,
        courseId,
        currentModule,
        performanceData
      );
      setIsCourseCompleted(true);
      Swal.fire({
        title: "Course Completed!",
        text: "Congratulations on completing the course! You will now be redirected to the assessment.",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/assessment", { state: { courseId } }); // Redirect to assessment with courseId
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

    const performanceData = {
      totalWarning: warningCount,
      criticalWarning: criticalWarningCount,
      understandingScore: 0,
      memoryScore: 0,
      analysisScore: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      ModuleCovered: currentModule,
      CurrentModule: nextModule,
    };
    await storeUserCourseStats(userId, courseId, nextModule, performanceData);
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

    if (!isModuleCompleted) {
      await showTestRulesAndGenerateQuestions();
    } else {
      await handleNextModule();
    }
  };

  const handleDownloadCertificate = () => {
    Swal.fire("Success", "Certificate download initiated!", "success");
    // Add certificate download logic here, e.g., navigate("/certificate", { state: { courseId } });
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

    const parsedContent = JSON.parse(courseDetails.courseContent);
    const module = parsedContent.modules[currentModule - 1];
    const content = `
      Module Title: ${module.moduleTitle}
      Overview: ${module.moduleOverview}
      Detailed Explanation: ${module.detailedExplanation}
      Examples and Analogies: ${module.examplesAndAnalogies}
      Key Takeaways: ${module.keyTakeaways.join(", ")}
    `;

    const newSpeech = new SpeechSynthesisUtterance(content);
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice;

    switch (preferredVoice) {
      case "microsoft-david":
        selectedVoice =
          voices.find((v) => v.name.includes("David") && v.lang === "en-US") ||
          voices.find((v) => v.lang === "en-US") ||
          voices[0];
        break;
      case "microsoft-hazel":
        selectedVoice =
          voices.find((v) => v.name.includes("Hazel") && v.lang === "en-GB") ||
          voices.find((v) => v.lang === "en-GB") ||
          voices[0];
        break;
      case "microsoft-susan":
        selectedVoice =
          voices.find((v) => v.name.includes("Susan") && v.lang === "en-GB") ||
          voices.find((v) => v.lang === "en-GB") ||
          voices[0];
        break;
      case "microsoft-heera":
        selectedVoice =
          voices.find((v) => v.name.includes("Heera") && v.lang === "en-IN") ||
          voices.find((v) => v.lang === "en-IN") ||
          voices[0];
        break;
      case "microsoft-ravi":
        selectedVoice =
          voices.find((v) => v.name.includes("Ravi") && v.lang === "en-IN") ||
          voices.find((v) => v.lang === "en-IN") ||
          voices[0];
        break;
      case "google-hindi":
        selectedVoice =
          voices.find((v) => v.lang === "hi-IN") ||
          voices.find((v) => v.lang.includes("hi")) ||
          voices[0];
        newSpeech.text = `मॉड्यूल शीर्षक: ${module.moduleTitle}
        अवलोकन: ${module.moduleOverview}
        विस्तृत व्याख्या: ${module.detailedExplanation}
        उदाहरण और उपमाएँ: ${module.examplesAndAnalogies}
        मुख्य निष्कर्ष: ${module.keyTakeaways.join(", ")}`;
        break;
      default:
        selectedVoice = voices[0];
    }

    if (selectedVoice) {
      newSpeech.voice = selectedVoice;
    } else {
      console.warn("No suitable voice found for:", preferredVoice);
      Swal.fire({
        title: "Warning",
        text: "No suitable voice found. Using default voice.",
        icon: "warning",
      });
    }

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

  useEffect(() => {
    const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log("Available voices:", voices);
      }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    } else {
      populateVoices();
    }
  }, []);

  // Helper function to check if module has YouTube videos or mind maps
  const hasYouTubeVideos = (module) => {
    return (
      module &&
      module.Refytvideo &&
      Array.isArray(module.Refytvideo) &&
      module.Refytvideo.length > 0
    );
  };

  const hasMindMaps = (module) => {
    return (
      module &&
      module.mindMaps &&
      typeof module.mindMaps === "string" &&
      module.mindMaps.trim() !== ""
    );
  };

  // Function to parse Markdown and generate a Graphviz DOT string
  const generateDotFromMarkdown = (markdown) => {
    if (!markdown) return "digraph G { }"; // Return an empty graph if markdown is invalid

    // Parse Markdown into a hierarchical structure
    const lines = markdown.split("\n").map((line) => line.trim());
    const nodes = [];
    const edges = [];
    let currentParent = null;
    let nodeCounter = 0; // To ensure unique node IDs

    // Parse the Markdown lines
    lines.forEach((line) => {
      if (line.startsWith("# ")) {
        // Main topic (root node)
        const title = line.replace("# ", "").trim();
        const nodeId = `node${nodeCounter++}`;
        nodes.push({
          id: nodeId,
          label: `📚 ${title}`,
          style: 'style=filled, fillcolor="#4CAF50", shape=ellipse, fontcolor="white"',
        });
        currentParent = nodeId;
      } else if (line.startsWith("- ")) {
        // Subtopic
        if (!currentParent) return; // Skip if no parent is defined
        const subtopic = line.replace("- ", "").trim();
        const [label, description] = subtopic.split(":").map((part) => part.trim());
        const nodeId = `node${nodeCounter++}`;
        nodes.push({
          id: nodeId,
          label: description ? `${label}\\n${description}` : label,
          style: 'style=filled, fillcolor="#2196F3", shape=box, fontcolor="white"',
        });
        edges.push({ from: currentParent, to: nodeId, label: "🔗" });
      }
    });

    // Generate DOT string
    let dot = `digraph G {
      rankdir=BT; // Bottom to top for a vertical layout
      bgcolor="#F9F9F9";
      node [fontname="Arial"];
      edge [color="#555555", fontcolor="#555555", fontname="Arial"];

      // Nodes
      ${nodes
        .map((node) => `"${node.id}" [label="${node.label}", ${node.style}];`)
        .join("\n      ")}

      // Edges
      ${edges
        .map((edge) => `"${edge.from}" -> "${edge.to}" [label="${edge.label}"];`)
        .join("\n      ")}
    }`;

    return dot;
  };

  // Function to render the mind map using d3-graphviz
  const renderMindMap = (markdown) => {
    if (!mindMapRef.current || !markdown) return;

    const dot = generateDotFromMarkdown(markdown);
    const container = mindMapRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(mindMapRef.current)
      .graphviz()
      .width(width) // Set the width to the container's width
      .height(height) // Set the height to the container's height
      .zoom(true) // Enable zooming
      .fit(true) // Fit the graph to the container
      .scale(1) // Initial scale
      .renderDot(dot)
      .on("end", () => {
        console.log("Mind map rendered");
      });
  };

  // Open the mind map modal and render the mind map
  const openMindMapModal = (markdown) => {
    setIsMindMapModalOpen(true);
    setTimeout(() => {
      renderMindMap(markdown);
    }, 0); // Ensure the DOM is ready
  };

  const closeMindMapModal = () => {
    setIsMindMapModalOpen(false);
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
                        {courseDetails.courseContent &&
                          (() => {
                            const parsedContent = JSON.parse(
                              courseDetails.courseContent
                            );
                            return (
                              <>
                                <h2>Course Title</h2>
                                <p>{boldData(parsedContent.title)}</p>

                                <h2>Introduction</h2>
                                <p style={{ whiteSpace: "pre-wrap" }}>
                                  {boldData(parsedContent.introduction)}
                                </p>
                              </>
                            );
                          })()}
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
                <button
                  className="speak_container"
                  onClick={handleTextToSpeech}
                >
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
                {courseDetails.courseContent &&
                  (() => {
                    const parsedContent = JSON.parse(
                      courseDetails.courseContent
                    );
                    const module = parsedContent.modules[currentModule - 1];
                    return (
                      <>
                        {!showQuestions && (
                          <div className="module-content">
                            <h3>{boldData(module.moduleTitle)}</h3>
                            <h4>
                              <strong>Overview</strong>
                            </h4>
                            <p>{boldData(module.moduleOverview)}</p>
                            <h4>
                              <strong>Detailed Explanation</strong>
                            </h4>
                            <p>{boldData(module.detailedExplanation)}</p>
                            <h4>
                              <strong>Examples and Analogies</strong>
                            </h4>
                            <p>{boldData(module.examplesAndAnalogies)}</p>
                            <h4>
                              <strong>Key Takeaways</strong>
                            </h4>
                            <ul>
                              {module.keyTakeaways.map((takeaway, idx) => (
                                <li key={idx}>{boldData(takeaway)}</li>
                              ))}
                            </ul>
                            {/* Conditionally render YouTube Video Reference */}
                            {hasYouTubeVideos(module) ? (
                              <>
                                <h4>
                                  <strong>YouTube Video Reference</strong>
                                </h4>
                                <ul>
                                  {module.Refytvideo.map((videoUrl, idx) => (
                                    <li key={idx}>
                                      <a
                                        href={videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {`YouTube Video ${idx + 1}`}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p>No YouTube video references available.</p>
                            )}
                            {/* Conditionally render Mind Map Link */}
                            {hasMindMaps(module) ? (
                              <>
                                <h4>
                                  <strong>Mind Map</strong>
                                </h4>
                                <p>
                                  <a
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openMindMapModal(module.mindMaps);
                                    }}
                                  >
                                    View Mind Map
                                  </a>
                                </p>
                              </>
                            ) : (
                              <p>No mind map available for this module.</p>
                            )}
                          </div>
                        )}

                        {showQuestions && (
                          <div className="question-course-info">
                            <p>Time: {formatTime(timer)}</p>
                            <h2>Answer the Questions</h2>
                            {aiQuestions.map((question, index) => (
                              <div
                                key={index}
                                className="question-course-section"
                              >
                                <h3>
                                  {index + 1}. {boldData(question.question)} (
                                  {question.type})
                                </h3>
                                <div className="options-container">
                                  {question.options &&
                                    question.options.map(
                                      (option, optionIndex) => (
                                        <label key={optionIndex}>
                                          <input
                                            type="radio"
                                            value={option.option}
                                            name={`question-${index}`}
                                          />
                                          <span className="option-label">
                                            {boldData(option.option)}
                                          </span>
                                        </label>
                                      )
                                    )}
                                </div>
                              </div>
                            ))}
                            <button
                              className="NextQuestion"
                              onClick={handleQuestionValidate}
                            >
                              Submit
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}

                <div>
                  <button
                    className="previous-button"
                    onClick={handlePrevious}
                    style={{
                      display:
                        isQuestionGenerated || currentModule === 1
                          ? "none"
                          : "inline-block",
                    }}
                  >
                    Previous
                  </button>
                  <button
                    className={
                      currentModule === moduleLength &&
                      isCourseCompleted &&
                      isAssessmentCompleted
                        ? "certificate-button"
                        : "next-button"
                    }
                    onClick={
                      currentModule === moduleLength &&
                      isCourseCompleted &&
                      isAssessmentCompleted
                        ? handleDownloadCertificate
                        : handleNext
                    }
                    style={{
                      display: isQuestionGenerated ? "none" : "inline-block",
                    }}
                  >
                    {currentModule === moduleLength &&
                    isCourseCompleted &&
                    isAssessmentCompleted
                      ? "Download Certificate"
                      : currentModule === moduleLength
                      ? "Complete"
                      : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mind Map Modal */}
      <Modal
        isOpen={isMindMapModalOpen}
        onRequestClose={closeMindMapModal}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            maxWidth: "800px",
            maxHeight: "80vh",
            overflow: "auto",
            backgroundColor: "#F9F9F9",
            borderRadius: "8px",
            padding: "20px",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        <h2 style={{ marginBottom: "10px" }}>Mind Map</h2>
        <button
          onClick={closeMindMapModal}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
        <div
          ref={mindMapRef}
          style={{
            width: "100%",
            height: "500px", // Fixed height, but fits within modal
            overflow: "auto", // Allow scrolling if the mind map overflows
          }}
        ></div>
      </Modal>
    </div>
  );
}

export default LearningPage;