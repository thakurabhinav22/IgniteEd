import React, { useEffect, useState } from "react";
import { ref, get, onValue, off } from "firebase/database"; // Import off to remove listeners properly
import { database } from "../Admin/firebase";
import { useNavigate } from "react-router-dom";
import List from "../icons/List.svg";
import "./DashboardContent.css";
import Cookies from "js-cookie";

function DashboardContent() {
  const [inProgressCourses, setInProgressCourses] = useState([]);
  const navigate = useNavigate();
  const userId = Cookies.get("userSessionCred");

  useEffect(() => {
    if (!userId) {
      navigate("/"); // Redirect to login if no user session
      return;
    }

    const userRef = ref(database, `user/${userId}/InProgressCourses`);

    // Listen for real-time updates
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        const coursesArray = Object.entries(coursesData).map(([id, data]) => ({ id, ...data }));

        // Fetch course names for each course ID
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
        });
      } else {
        setInProgressCourses([]);
      }
    });

    // Cleanup listener when component unmounts
    return () => {
      unsubscribe(); // Detach the listener by calling the unsubscribe function
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

      <div className="stats-container"></div>

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
                  const progress = (course.ModuleCovered / course.TotalModules) * 100;
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
                          {progress === 100 ? "Continue" : "Completed"}
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
