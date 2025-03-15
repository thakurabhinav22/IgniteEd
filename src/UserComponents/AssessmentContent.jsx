import React, { useState, useEffect } from "react";
import "./AssessmentContent.css";
import { useLocation, useNavigate } from "react-router-dom";
import { database } from "../Admin/firebase";
import { ref, get, set } from "firebase/database";
import Swal from "sweetalert2";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Cookies from "js-cookie";

const API_KEY = process.env.REACT_APP_GEMINI;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function AssessmentContent() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const courseId = state?.courseId;
  const [courseContent, setCourseContent] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [answers, setAnswers] = useState({});
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [followUpAdded, setFollowUpAdded] = useState(false);
  const [isAssessmentCompletedInDB, setIsAssessmentCompletedInDB] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setError("No course selected. Please go back and select a course.");
      setLoading(false);
      return;
    }

    const fetchCourseContentAndAssessmentStatus = async () => {
      try {
        const userId = Cookies.get("userSessionCred");
        if (!userId) {
          setError("User not logged in. Please log in to proceed.");
          setLoading(false);
          return;
        }

        const contentRef = ref(database, `Courses/${courseId}/courseContent`);
        const contentSnapshot = await get(contentRef);
        if (contentSnapshot.exists()) {
          setCourseContent(contentSnapshot.val());
        } else {
          setError("No course content found for this course ID.");
        }

        const assessmentRef = ref(database, `users/${userId}/${courseId}/assessmentComplete`);
        const assessmentSnapshot = await get(assessmentRef);
        if (assessmentSnapshot.exists() && assessmentSnapshot.val() === true) {
          setIsAssessmentCompletedInDB(true);
        }
      } catch (err) {
        setError(`Error fetching data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseContentAndAssessmentStatus();
  }, [courseId]);

  const isProgrammingCourse = (content) => {
    const programmingKeywords = ["code", "programming", "smart contract", "function", "algorithm", "syntax"];
    return programmingKeywords.some((keyword) => content.toLowerCase().includes(keyword));
  };

  const generateQuestions = async (content) => {
    const contentString = `Modules: ${content}`;
    const prompt = `Generate 1 practical, application-focused questions based on the provided content, categorized by Bloom's Taxonomy levels, using a mix of short-answer and long-form formats. Each question must be concise (2-3 lines maximum):
  - 1 question at "Remember" level: A Short Answer question requiring a one-word answer that recalls a specific, practical fact, tool, or action from real-world use (e.g., a company name, tool, or technique explicitly mentioned in the content).
  - Ensure all questions are directly tied to the provided content. Do not generate questions unrelated to the content (e.g., avoid programming questions if the content lacks code or programming concepts).
  - If the content explicitly includes programming-related terms (e.g., "code," "programming," "function," "algorithm"), include at least one question requiring the user to write a simple program (questionType: "Coding"). For this question, provide a correct answer with sample code (max 5-10 lines) and suggest one specific improvement (e.g., optimization, error handling) to enhance user understanding.
  - Questions must focus on hands-on application, real-world use, or scenario-based problem-solving relevant to the content.
  - For Short Answer: Provide a one-word correct answer explicitly derived from the content.
  - For Long Form (including Coding): Provide a correct answer (100-150 words) explaining a practical process, concept, or code in a real-world context, ensuring a clear, scenario-based response.
  - If the content is insufficient to generate both questions, return an empty array in the JSON.
  - Output **only** valid JSON, with no additional text, comments, or markdown:
    {
      "questions": [
        {
          "question": "Question text",
          "type": "Remember|Understand",
          "questionType": "ShortAnswer|LongForm|Coding",
          "correctAnswer": "answer"
        }
      ]
    }
Content:
${contentString}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonText = text.substring(jsonStart, jsonEnd);
      const data = JSON.parse(jsonText);
      return data.questions;
    } catch (error) {
      Swal.fire("Error", `Failed to generate questions: ${error.message}`, "error");
      return [];
    }
  };

  const validateAnswer = async (question, userAnswer) => {
    const isProgramming = isProgrammingCourse(courseContent || "");
    const escapedUserAnswer = userAnswer.replace(/"/g, '\\"');
    const escapedCorrectAnswer = question.correctAnswer.replace(/"/g, '\\"');
    const validationPrompt = `Validate the user's answer for the following:
    Input: {"question": "${question.question}", "userAnswer": "${escapedUserAnswer}"}
    Compare with correct answer: "${escapedCorrectAnswer}"
    Return JSON: {"validation": 1} if correct, {"validation": 0} if incorrect.
    If correct (1) and no follow-up has been added yet, generate **exactly one** follow-up question:
      - At the next Bloom's level (e.g., Understand → Analyze), concise (2-3 lines).
      - Only use "Coding" questionType (max 5-10 lines) if the content explicitly mentions programming-related terms (e.g., 'code', 'programming', 'smart contract', 'function'); otherwise, use ShortAnswer.
      - **Do not generate more than one follow-up question under any circumstances.**
    Output **only** valid JSON, with no additional text, comments, or markdown:
    {
      "validation": 1|0,
      "followUpQuestion": {"question": "Follow-up text", "type": "Analyze", "questionType": "Coding|ShortAnswer", "correctAnswer": "answer"} // if validation = 1 and no follow-up yet
    }
    Programming-related: ${isProgramming}`;

    try {
      const result = await model.generateContent(validationPrompt);
      const text = result.response.text().trim();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonText = text.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonText);
    } catch (error) {
      console.error("Validation error:", error);
      Swal.fire("Error", "Failed to validate answer due to malformed response.", "error");
      return { validation: 0 };
    }
  };

  const handleStartTest = async () => {
    Swal.fire({
      title: "Ready to Start?",
      text: "Answer all questions correctly to earn your certificate. Good luck!",
      icon: "info",
      confirmButtonText: "Start Quiz",
      confirmButtonColor: "#007AFF",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (!courseContent) {
          Swal.fire("Error", "Course content not available.", "error");
          return;
        }
        setLoading(true);
        const questions = await generateQuestions(courseContent);
        setGeneratedQuestions(questions);
        setShowQuestions(true);
        setLoading(false);
      } else {
        navigate(-1);
      }
    });
  };

  const handleDownloadCertificate = () => {
    Swal.fire("Success", "Certificate download initiated!", "success");
  };

  const handleAnswerSubmit = async () => {
    const currentQuestion = generatedQuestions[currentQuestionIndex];
    const userAnswer = answers[currentQuestionIndex]?.trim();

    if (!userAnswer) {
      Swal.fire("Error", "Please provide an answer before submitting.", "warning");
      return;
    }

    const validationResult = await validateAnswer(currentQuestion, userAnswer);

    if (validationResult.validation === 1) {
      Swal.fire("Correct!", "Great job! Moving to the next question.", "success");

      if (currentQuestionIndex === 0 && validationResult.followUpQuestion && !followUpAdded) {
        setGeneratedQuestions((prev) => [...prev, validationResult.followUpQuestion]);
        setFollowUpAdded(true);
      }

      if (currentQuestionIndex + 1 < generatedQuestions.length) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (currentQuestionIndex === 2) {
        const userId = Cookies.get("userSessionCred");
        if (!userId) {
          Swal.fire("Error", "User not logged in. Cannot save assessment status.", "error");
          return;
        }

        const assessmentRef = ref(database, `user/${userId}/${courseId}/assessmentComplete`);
        try {
          await set(assessmentRef, true);
          setAssessmentComplete(true);
          setIsAssessmentCompletedInDB(true);
          Swal.fire("Completed!", "You’ve passed the assessment!", "success").then(() => navigate(-1));
        } catch (error) {
          Swal.fire("Error", `Failed to save assessment status: ${error.message}`, "error");
        }
      }
    } else {
      Swal.fire({
        title: "Incorrect",
        text: "Your answer was wrong. Try again?",
        icon: "error",
        confirmButtonText: "Retry",
        cancelButtonText: "Cancel",
        showCancelButton: true,
      }).then((result) => {
        if (result.isDismissed) {
          navigate(-1);
        }
      });
    }
  };

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: value,
    }));
  };

  return (
    <div className="quiz-page">
      <div className="quiz-wrapper">
        {loading && (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Loading your quiz...</p>
          </div>
        )}
        {error && (
          <div className="error-panel">
            <p>{error}</p>
            <button className="back-btn" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        )}
        {!loading && !error && courseContent && !showQuestions && (
          <div className="quiz-start-panel">
            <h1>Ready to Take the Quiz?</h1>
            <p>Test your knowledge and earn your certificate!</p>
            <button
              className={isAssessmentCompletedInDB ? "certificate-btn" : "start-btn"}
              onClick={isAssessmentCompletedInDB ? handleDownloadCertificate : handleStartTest}
            >
              {isAssessmentCompletedInDB ? "Download Certificate" : "Start Quiz"}
            </button>
          </div>
        )}
        {!loading && !error && showQuestions && generatedQuestions.length > 0 && (
          <div className="quiz-content">
            <h1>Quiz Time</h1>
            <div className="progress-indicator">
              <div
                className="progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / generatedQuestions.length) * 100}%` }}
              ></div>
            </div>
            <div className="question-panel">
              <div className="question-info">
                <span className="question-number">Question {currentQuestionIndex + 1}</span>
                <span className="question-type">
                  {generatedQuestions[currentQuestionIndex].type} -{" "}
                  {generatedQuestions[currentQuestionIndex].questionType}
                </span>
              </div>
              <p className="question-text">{generatedQuestions[currentQuestionIndex].question}</p>
              {generatedQuestions[currentQuestionIndex].questionType === "ShortAnswer" && (
                <input
                  type="text"
                  value={answers[currentQuestionIndex] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Enter your answer"
                  maxLength={50}
                  className="answer-input short-answer"
                />
              )}
              {(generatedQuestions[currentQuestionIndex].questionType === "LongForm" ||
                generatedQuestions[currentQuestionIndex].questionType === "Coding") && (
                <textarea
                  value={answers[currentQuestionIndex] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={
                    generatedQuestions[currentQuestionIndex].questionType === "LongForm"
                      ? "Write your answer here (100-150 words)"
                      : "Write your code here (max 5-10 lines)"
                  }
                  rows={5}
                  className={`answer-input ${
                    generatedQuestions[currentQuestionIndex].questionType === "Coding" ? "coding" : "long-form"
                  }`}
                />
              )}
              <button className="submit-btn" onClick={handleAnswerSubmit}>
                Submit Answer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssessmentContent;