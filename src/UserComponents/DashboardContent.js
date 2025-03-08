import React, { useEffect, useState } from "react";
import { ref, get, onValue, off, set } from "firebase/database";
import { database } from "../Admin/firebase";
import { useNavigate } from "react-router-dom";
import List from "../icons/List.svg";
import "./DashboardContent.css";
import Cookies from "js-cookie";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function DashboardContent() {
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const [streak, setStreak] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const navigate = useNavigate();
  const userId = Cookies.get("userSessionCred");

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }

    const userRef = ref(database, `user/${userId}`);
    const coursesRef = ref(database, `user/${userId}/InProgressCourses`);
    const streakRef = ref(database, `user/${userId}/streak`);

    // Update login streak on page load (simulating login)
    const updateLoginStreak = async () => {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const streakSnapshot = await get(streakRef);
      let currentStreak = 0;
      let lastLogin = today;

      if (streakSnapshot.exists()) {
        const streakData = streakSnapshot.val();
        currentStreak = streakData.current || 0;
        lastLogin = streakData.lastLogin || today;
      }

      const lastDate = new Date(lastLogin);
      const currentDate = new Date(today);
      const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak += 1; // Increment streak for consecutive login
      } else if (diffDays > 1) {
        currentStreak = 1; // Reset to 1 if gap > 1 day
      } else if (diffDays === 0) {
        // No change if same day
      } else if (diffDays < 0) {
        // Prevent future date issues
        currentStreak = 1;
      }

      setStreak(currentStreak);
      await set(streakRef, { current: currentStreak, lastLogin: today });
    };

    updateLoginStreak();

    // Real-time listener for in-progress courses
    const unsubscribe = onValue(coursesRef, (snapshot) => {
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        const coursesArray = Object.entries(coursesData).map(([id, data]) => ({
          id,
          ...data,
        }));

        const coursePromises = coursesArray.map(async (course) => {
          const courseRef = ref(database, `Courses/${course.id}/courseName`);
          const courseSnapshot = await get(courseRef);
          return {
            ...course,
            courseName: courseSnapshot.exists() ? courseSnapshot.val() : "Name Not Available",
          };
        });

        Promise.all(coursePromises).then((completedCourses) => {
          setInProgressCourses(completedCourses);

          // Calculate completion rate
          const totalCourses = completedCourses.length;
          const totalProgress = completedCourses.reduce((sum, course) => {
            const progress = course.TotalModules > 0 ? (course.ModuleCovered / course.TotalModules) * 100 : 0;
            return sum + progress;
          }, 0);
          const rate = totalCourses > 0 ? totalProgress / totalCourses : 0;
          setCompletionRate(rate);
        });
      } else {
        setInProgressCourses([]);
        setCompletionRate(0);
      }
    });

    return () => {
      off(coursesRef);
    };
  }, [navigate, userId]);

  const handleGoToCourses = () => {
    navigate("/courses");
  };

  const handleContinue = (courseId, progress) => {
    console.log("Navigating with courseId:", courseId, "Progress:", progress);
    if (progress === 100) {
      navigate("/stats", { state: { courseId, progress } });
    } else {
      navigate("/courses/learn", { state: { courseId } });
    }
  };

  const stats = [
    { value: completionRate, color: "#e43a3c", label: "Completion Rate" },
    { value: streak, color: "#9fef00", label: "Login Streaks" },
  ];

  return (
    <div className="dashboard-content">
      <h1 className="Title-dashboard">Dashboard</h1>

      <div className="stats-container">
        {stats.map((stat, index) => (
          <div key={index} className="progress-circle">
            <CircularProgressbar
              value={stat.value}
              maxValue={stat.label === "Login Streaks" ? 365 : 100}
              text={stat.label === "Login Streaks" ? `${stat.value} Days` : `${stat.value.toFixed(1)}%`}
              styles={buildStyles({
                textColor: "black",
                pathColor: stat.color,
                trailColor: "#1c283c",
              })}
            />
            <p style={{ color: stat.color }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="course-container">
        <div className="course-container-title">
          <img src={List} alt="List icon" />
          In Progress Courses
        </div>

        <div className="course-list">
          {inProgressCourses.length > 0 ? (
            <table className="courses-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inProgressCourses.map((course) => {
                  const progress = course.TotalModules > 0
                    ? (course.ModuleCovered / course.TotalModules) * 100
                    : 0;

                  return (
                    <tr className="Course-table-rows" key={course.id}>
                      <td className="Course-table-rows">{course.courseName}</td>
                      <td className="Course-table-rows">
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="Course-table-rows">
                        <button
                          className="continue-btn"
                          onClick={() => handleContinue(course.id, progress)}
                          style={{ cursor: "pointer" }}
                        >
                          {progress === 100 ? "View Stats" : "Continue"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="no-courses">
              <p>No courses in progress.</p>
              <button onClick={handleGoToCourses} style={{ cursor: "pointer" }}>
                Explore Courses
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardContent;