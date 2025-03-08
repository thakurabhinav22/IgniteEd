import React, { useEffect, useState } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { useNavigate } from "react-router-dom";
import "./AnalyticsPage.css";
import Sidebar from "./Sidebar";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState({
    memoryScore: 0,
    analysisScore: 0,
    understandingScore: 0,
    totalCoursesApplied: 0,
    totalCoursesCompleted: 0,
  });
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const db = getDatabase();

  const getUserIdFromCookie = () => {
    const cookieValue = document.cookie.split("; ").find((row) => row.startsWith("userSessionCred="));
    return cookieValue ? cookieValue.split("=")[1] : null;
  };

  useEffect(() => {
    const userId = getUserIdFromCookie();
    if (!userId) {
      console.error("No user ID found in cookies");
      setLoading(false);
      return;
    }

    const userRef = ref(db, `user/${userId}`);
    const analyticsRef = ref(db, `user/${userId}/analytics`);

    // Fetch user name
    get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserName(`${userData.Name || "User"} ${userData.Surname || ""}`.trim());
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
      });

    // Fetch analytics data
    get(analyticsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setAnalyticsData(snapshot.val());
        } else {
          console.log("No analytics data found for user");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching analytics data:", error);
        setLoading(false);
      });
  }, []);

  // Bar Chart Data for Scores
  const barData = {
    labels: ["Memory", "Analysis", "Understanding"],
    datasets: [
      {
        label: "Your Scores",
        data: [analyticsData.memoryScore, analyticsData.analysisScore, analyticsData.understandingScore],
        backgroundColor: ["#60A5FA", "#F87171", "#FBBF24"],
        borderColor: ["#60A5FA", "#F87171", "#FBBF24"],
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows better fitting
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 14, family: "'Roboto', sans-serif" } },
      },
      title: {
        display: true,
        text: "Your Learning Strengths",
        font: { size: 20, weight: "bold", family: "'Roboto', sans-serif" },
        padding: 20,
        color: "#1E40AF",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Score",
          font: { size: 14, family: "'Roboto', sans-serif" },
        },
        ticks: { font: { size: 12 } },
      },
      x: {
        ticks: { font: { size: 12 } },
      },
    },
  };

  // Pie Chart Data for Courses
  const pieData = {
    labels: ["Courses Completed", "Courses In Progress"],
    datasets: [
      {
        data: [analyticsData.totalCoursesCompleted, analyticsData.totalCoursesApplied - analyticsData.totalCoursesCompleted],
        backgroundColor: ["#34D399", "#F59E0B"],
        borderColor: ["#34D399", "#F59E0B"],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allows better fitting
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 14, family: "'Roboto', sans-serif" } },
      },
      title: {
        display: true,
        text: "Your Course Journey",
        font: { size: 20, weight: "bold", family: "'Roboto', sans-serif" },
        padding: 20,
        color: "#1E40AF",
      },
    },
  };

  return (
    <div className="analytics-page-container">
      <Sidebar />
      <div className="analytics-main-content">
        {loading ? (
          <div className="loading-content">
            <p>Loading Your Analytics...</p>
          </div>
        ) : (
          <>
            <header className="analytics-header">
              <h1>Welcome, {userName}!</h1>
              <p>Your personalized learning dashboard</p>
            </header>
            <section className="stats-overview">
              <div className="stat-box">
                <h3>{analyticsData.totalCoursesApplied}</h3>
                <p>Courses Started</p>
              </div>
              <div className="stat-box">
                <h3>{analyticsData.totalCoursesCompleted}</h3>
                <p>Courses Completed</p>
              </div>
              <div className="stat-box">
                <h3>{Math.round((analyticsData.memoryScore + analyticsData.analysisScore + analyticsData.understandingScore) / 3)}</h3>
                <p>Avg. Score</p>
              </div>
            </section>
            <section className="charts-container">
              <div className="chart-card">
                <h2>Your Learning Strengths</h2>
                <div className="chart-wrapper">
                  <Bar data={barData} options={barOptions} />
                </div>
                <div className="stats-details">
                  <p><strong>Memory:</strong> {analyticsData.memoryScore}</p>
                  <p><strong>Analysis:</strong> {analyticsData.analysisScore}</p>
                  <p><strong>Understanding:</strong> {analyticsData.understandingScore}</p>
                </div>
              </div>
              <div className="chart-card">
                <h2>Your Course Journey</h2>
                <div className="chart-wrapper chart-pie-wrapper">
                  <Pie data={pieData} options={pieOptions} />
                </div>
                <div className="stats-details">
                  <p><strong>Total Started:</strong> {analyticsData.totalCoursesApplied}</p>
                  <p><strong>Completed:</strong> {analyticsData.totalCoursesCompleted}</p>
                  <p><strong>In Progress:</strong> {analyticsData.totalCoursesApplied - analyticsData.totalCoursesCompleted}</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;