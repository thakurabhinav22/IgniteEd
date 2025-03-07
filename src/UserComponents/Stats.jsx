import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../Admin/firebase";
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
import Cookies from "js-cookie"; // For userId
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

  const { courseId, progress } = location.state || {};
  const userId = Cookies.get("userSessionCred"); // Assuming userId from cookies

  useEffect(() => {
    console.log("Stats - Received from Dashboard:", { courseId, progress });

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

        // Fetch stats
        const statsRef = ref(database, `user/${userId}/InProgressCourses/${courseId}/stats`);
        const statsSnapshot = await get(statsRef);

        // Fetch performance analysis
        const performanceRef = ref(database, `user/${userId}/InProgressCourses/${courseId}/stats/performanceAnalysis`);
        const performanceSnapshot = await get(performanceRef);

        if (courseSnapshot.exists()) {
          const courseData = courseSnapshot.val();
          console.log("Fetched course data:", courseData);

          const stats = statsSnapshot.exists() ? statsSnapshot.val() : {};
          console.log("Fetched stats data:", stats);

          const performance = performanceSnapshot.exists() ? performanceSnapshot.val() : {};
          console.log("Fetched performance data:", performance);

          setCourseDetails({
            courseId,
            courseName: courseData.courseName || "Unknown Course",
            totalModules: courseData.totalModules || 0,
            modulesCovered: progress === 100 ? courseData.totalModules || 0 : 0,
            completionRate: progress || 0,
          });

          setStatsData({
            averageTimeTaken: stats.averageTimeTaken || 0,
            criticalWarning: stats.criticalWarning || "None",
            currentModule: stats.currentModule || 0,
          });

          setPerformanceData({
            accuracy: performance.accuracy || 0,
            analysisScore: performance.analysisScore || 0,
            memoryScore: performance.memoryScore || 0,
            understandingScore: performance.understandingScore || 0,
          });
        } else {
          console.log("Course not found in Firebase");
          setCourseDetails({
            courseId,
            courseName: "Course Not Found",
            totalModules: 0,
            modulesCovered: 0,
            completionRate: progress || 0,
          });
          setStatsData({ averageTimeTaken: 0, criticalWarning: "None", currentModule: 0 });
          setPerformanceData({ accuracy: 0, analysisScore: 0, memoryScore: 0, understandingScore: 0 });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setCourseDetails({
          courseId,
          courseName: "Error Loading Course",
          totalModules: 0,
          modulesCovered: 0,
          completionRate: progress || 0,
        });
        setStatsData({ averageTimeTaken: 0, criticalWarning: "Error", currentModule: 0 });
        setPerformanceData({ accuracy: 0, analysisScore: 0, memoryScore: 0, understandingScore: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, progress, userId, navigate]);

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
  ];

  // Radar chart data
  const radarData = {
    labels: ["Accuracy", "Analysis", "Memory", "Understanding"],
    datasets: [
      {
        label: "Performance Analysis",
        data: [
          performanceData.accuracy,
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

  const radarOptions = {
    scales: {
      r: {
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { stepSize: 20 },
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
        <h1 className="stats-header-title">Course Performance Overview</h1>
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
        <h4 className="stats-details-title">Course Statistics</h4>
        <div className="stats-details-grid">
          <div className="stats-detail-item">
            <span className="stats-detail-label">Average Time Taken:</span>
            <span className="stats-detail-value">{statsData.averageTimeTaken} mins</span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Critical Warning:</span>
            <span className="stats-detail-value">{statsData.criticalWarning}</span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Current Module:</span>
            <span className="stats-detail-value">{statsData.currentModule}</span>
          </div>
          <div className="stats-detail-item">
            <span className="stats-detail-label">Modules Completed:</span>
            <span className="stats-detail-value">{courseDetails.modulesCovered} / {courseDetails.totalModules}</span>
          </div>
        </div>
      </section>

      <section className="stats-performance-section">
        <h4 className="stats-performance-title">Performance Analysis</h4>
        <div className="stats-radar-chart">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </section>

      <section className="stats-actions-section">
        <button onClick={() => navigate("/dashboard")} className="stats-return-button">
          Back to Dashboard
        </button>
      </section>
    </div>
  );
}

export default Stats;