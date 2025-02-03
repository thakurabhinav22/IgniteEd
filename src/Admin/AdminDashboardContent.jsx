import React, { useEffect, useState } from "react";
import { database } from "./firebase";
import { ref, get, remove } from "firebase/database";
import "./AdminDashboardContent.css";

export default function AdminDashboardContent() {
  const [courses, setCourses] = useState([]);

  const getCookieValue = (name) => {
    const cookies = document.cookie.split("; ");
    for (let cookie of cookies) {
      const [key, value] = cookie.split("=");
      if (key === name) return value;
    }
    return null;
  };

  useEffect(() => {
    const fetchCourses = async () => {
      const cookieValue = getCookieValue("userSessionCredAd");
      if (!cookieValue) {
        console.error("No session cookie found!");
        return;
      }

      try {
        const adminRef = ref(database, `admin/${cookieValue}`);
        const snapshot = await get(adminRef);

        if (snapshot.exists()) {
          const adminData = snapshot.val();
          if (adminData.courses) {
            setCourses(Object.entries(adminData.courses).map(([key, value]) => ({
              courseId: key, // Getting the courseId from Firebase key
              ...value,
            })));
          } else {
            console.error("No courses found!");
          }
        } else {
          console.error("No admin data found!");
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
  }, []);

const deleteCourse = async (courseId) => {
  const isConfirmed = window.confirm("Are you sure you want to delete this course?");
  
  if (!isConfirmed) {
    return;
  }

  const cookieValue = getCookieValue("userSessionCredAd");
  if (!cookieValue) {
    console.error("No session cookie found!");
    return;
  }

  try {
    const courseRef = ref(database, `admin/${cookieValue}/courses/${courseId}`);
    await remove(courseRef); 

    setCourses(courses.filter(course => course.courseId !== courseId));

    console.log("Course deleted successfully");
  } catch (error) {
    console.error("Error deleting course:", error);
  }
};

  return (
    <div className="Progress-content-cover">
      <h1>Admin Dashboard</h1>
      <div className="Progress-content">
        <h2>Courses</h2>
        <table className="courses-table">
          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>Course Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length > 0 ? (
              courses.map((course, index) => (
                <tr key={course.courseId} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                  <td>{index + 1}</td> {/* Serial Number */}
                  <td>{course.courseName}</td>
                  <td>
                    <button className="action-btn stats-btn">Stats</button>
                    <button className="action-btn modify-btn">Modify</button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => deleteCourse(course.courseId)} 
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="no-courses">No courses available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
