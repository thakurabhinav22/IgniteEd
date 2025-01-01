import React, { useEffect, useState } from "react";
import { ref, get, onValue, off } from "firebase/database"; 
import { database } from "../Admin/firebase";
import { useNavigate } from "react-router-dom";
import List from "../icons/List.svg";
import "./DashboardContent.css";
import Cookies from "js-cookie";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';

function DashboardContent() {
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const navigate = useNavigate();
  const userId = Cookies.get("userSessionCred");

  const stats = [
    { value: 50, color: "#e43a3c", label: "Completion Rate" },
    { value: 1, color: "#9fef00", label: "Streaks" },
    // { value: 10, color: "#0086ff", label: "Active Days" },
  ];


  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }

    const userRef = ref(database, `user/${userId}/InProgressCourses`);

    const unsubscribe = onValue(userRef, (snapshot) => {
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
            courseName: courseSnapshot.exists()
              ? courseSnapshot.val()
              : "Name Not Available",
          };
        });

        Promise.all(coursePromises).then((completedCourses) => {
          setInProgressCourses(completedCourses);
        });
      } else {
        setInProgressCourses([]);
      }
    });

    return () => {
      unsubscribe(); 
    };
  }, [navigate, userId]);

  const handleGoToCourses = () => {
    navigate("/courses");
  };

  const handleContinue = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="dashboard-content">
      <h1>Dashboard</h1>

      <div className="stats-container">
  {stats.map((stat, index) => (
    <div key={index} className="progress-circle">
      <CircularProgressbar
        value={stat.value}
        maxValue={stat.label === "Streaks" ? 365 : 100} // Adjust maxValue if needed
        text={stat.label === "Streaks" ? `${stat.value} Days` : `${stat.value.toFixed(2)}%`}
        styles={buildStyles({
          textColor: "#fff",
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
                  const progress =
                    (course.ModuleCovered / course.TotalModules) * 100;
                  
                  return (
                    <tr key={course.id}>
                      <td>{course.courseName}</td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="continue-btn"
                          onClick={() => handleContinue(course.id)}
                        >
                          {progress === 100 ? "Completed" : "Continue"}
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
              <button onClick={handleGoToCourses}>Explore Courses</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardContent;
