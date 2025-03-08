import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../Admin/firebase"; // Adjust path as needed
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import Cookies from "js-cookie";
import "./Stats.css";

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function Stats() {
  const [courseDetails, setCourseDetails] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const { courseId } = location.state || {};
  const userId = Cookies.get("userSessionCred");

  useEffect(() => {
    console.log("Stats - Received from Dashboard:", { courseId });

    if (!courseId || !userId) {
      console.log("Missing courseId or userId, redirecting to dashboard");
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch course details
        const courseRef = ref(database, `Courses/${courseId}`);
        const courseSnapshot = await get(courseRef);
        console.log("Fetched course data:", courseSnapshot.val());

        // Fetch user course data
        const userCourseRef = ref(database, `user/${userId}/InProgressCourses/${courseId}`);
        const userCourseSnapshot = await get(userCourseRef);
        console.log("Fetched user course data:", userCourseSnapshot.val());

        if (courseSnapshot.exists() && userCourseSnapshot.exists()) {
          const courseData = courseSnapshot.val();
          const userCourseData = userCourseSnapshot.val();

          // Calculate average time taken across all modules
          const moduleDetails = userCourseData.moduleDetail || {};
          const moduleCount = Object.keys(moduleDetails).length;
          const totalTimeTaken = Object.values(moduleDetails).reduce(
            (sum, detail) => sum + (detail.timeTaken || 0),
            0
          );
          const averageTimeTaken = moduleCount > 0 ? totalTimeTaken / moduleCount / 60 : 0;

          // Calculate completion rate
          const totalModules = userCourseData.TotalModules || courseData.noOfModules || 0;
          const modulesCovered = userCourseData.ModuleCovered || 0;
          const completionRate = totalModules > 0 ? (modulesCovered / totalModules) * 100 : 0;

          const courseStats = {
            courseId,
            courseName: courseData.courseName || "Unknown Course",
            totalModules,
            modulesCovered,
            completionRate,
          };
          console.log("Processed courseDetails:", courseStats);
          setCourseDetails(courseStats);

          const stats = {
            averageTimeTaken: averageTimeTaken.toFixed(2),
            criticalWarning: userCourseData.CriticalWarning || 0,
            currentModule: userCourseData.CurrentModule || 1,
            totalWarning: userCourseData.Warning || 0,
          };
          console.log("Processed statsData:", stats);
          setStatsData(stats);

          const performance = {
            accuracy: userCourseData.performanceAnalysis?.accuracy || 0,
            analysisScore: userCourseData.performanceAnalysis?.analysisScore || 0,
            memoryScore: userCourseData.performanceAnalysis?.memoryScore || 0,
            understandingScore: userCourseData.performanceAnalysis?.understandingScore || 0,
            totalQuestionsAnswered: userCourseData.performanceAnalysis?.totalQuestionsAnswered || 0,
            correctAnswers: userCourseData.performanceAnalysis?.correctAnswers || 0,
          };
          console.log("Processed performanceData:", performance);
          setPerformanceData(performance);
        } else {
          console.log("Course or user data not found in Firebase");
          setCourseDetails({
            courseId,
            courseName: "Course Not Found",
            totalModules: 0,
            modulesCovered: 0,
            completionRate: 0,
          });
          setStatsData({
            averageTimeTaken: 0,
            criticalWarning: 0,
            currentModule: 1,
            totalWarning: 0,
          });
          setPerformanceData({
            accuracy: 0,
            analysisScore: 0,
            memoryScore: 0,
            understandingScore: 0,
            totalQuestionsAnswered: 0,
            correctAnswers: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setCourseDetails({
          courseId,
          courseName: "Error Loading Course",
          totalModules: 0,
          modulesCovered: 0,
          completionRate: 0,
        });
        setStatsData({
          averageTimeTaken: 0,
          criticalWarning: 0,
          currentModule: 1,
          totalWarning: 0,
        });
        setPerformanceData({
          accuracy: 0,
          analysisScore: 0,
          memoryScore: 0,
          understandingScore: 0,
          totalQuestionsAnswered: 0,
          correctAnswers: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, userId, navigate]);

  if (loading) {
    return (
      <div className="stats-loader-wrapper">
        <p className="stats-loader-text">Loading Course Statistics...</p>
      </div>
    );
  }

  if (!courseDetails || !statsData || !performanceData) {
    return (
      <div className="stats-error-wrapper">
        <p className="stats-error-text">
          Unable to load course details. Course ID: {courseId || "Unknown"}
        </p>
        <button onClick={() => navigate("/dashboard")} className="stats-back-button">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const completionStats = [
    {
      value: courseDetails.completionRate,
      color: "#4CAF50",
      label: "Completion Rate",
    },
    {
      value: performanceData.accuracy,
      color: "#2196F3",
      label: "Accuracy",
    },
  ];

  const radarData = {
    labels: ["Analysis", "Memory", "Understanding"],
    datasets: [
      {
        label: "Performance Analysis",
        data: [
          performanceData.analysisScore,
          performanceData.memoryScore,
          performanceData.understandingScore,
        ],
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        borderColor: "#4CAF50",
        borderWidth: 2,
        pointBackgroundColor: "#4CAF50",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#4CAF50",
      },
    ],
  };

  console.log("Radar chart data:", radarData);

  const radarOptions = {
    scales: {
      r: {
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: Math.max(
          performanceData.analysisScore,
          performanceData.memoryScore,
          performanceData.understandingScore
        ) > 0
          ? Math.ceil(
              Math.max(
                performanceData.analysisScore,
                performanceData.memoryScore,
                performanceData.understandingScore
              ) / 10
            ) * 10 + 10 // Round up to nearest 10 and add a buffer
          : 10, // Default to 10 if all values are 0
        ticks: { stepSize: 10 }, // Adjusted step size for smaller scale
      },
    },
    plugins: {
      legend: { position: "top" },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="stats-main-container">
      <header className="stats-header">
        <h1 className="stats-header-title">Course Performance Dashboard</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="stats-header-back-button"
        >
          Back to Dashboard
        </button>
      </header>

      <section className="stats-course-summary">
        <h2 className="stats-course-id">Course ID: {courseDetails.courseId}</h2>
        <h3 className="stats-course-title">{courseDetails.courseName}</h3>
      </section>

      <section className="stats-metrics-section">
        {completionStats.map((stat, index) => (
          <div key={index} className="stats-metric-card">
            <CircularProgressbar
              value={stat.value}
              maxValue={100}
              text={`${stat.value.toFixed(1)}%`}
              styles={buildStyles({
                textColor: "#333",
                pathColor: stat.color,
                trailColor: "#e0e0e0",
                textSize: "18px",
              })}
            />
            <p className="stats-metric-label">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="stats-details-section">
        <h4 className="stats-details-title">Detailed Statistics</h4>
        <div className="stats-details-grid">

          <div className="stats-detail-item">
            <span className="stats-detail-label">Total Warnings:</span>
            <span className="stats-detail-value">{statsData.totalWarning}</span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Critical Warnings:</span>
            <span className="stats-detail-value">{statsData.criticalWarning}</span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Current Module:</span>
            <span className="stats-detail-value">{statsData.currentModule}</span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Modules Completed:</span>
            <span className="stats-detail-value">
              {courseDetails.modulesCovered} / {courseDetails.totalModules}
            </span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Questions Answered:</span>
            <span className="stats-detail-value">
              {performanceData.correctAnswers} / {performanceData.totalQuestionsAnswered}
            </span>
          </div>
        </div>
      </section>

      <section className="stats-performance-section">
        <h4 className="stats-performance-title">Performance Analysis</h4>
        <div className="stats-radar-chart">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </section>
    </div>
  );
}

export default Stats;