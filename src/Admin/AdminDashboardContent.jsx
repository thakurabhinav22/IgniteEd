import React, { useEffect, useState } from "react";
import { database } from "./firebase"; // Import Firebase database
import { ref, get } from "firebase/database";
import "./AdminDashboardContent.css";

export default function AdminDashboardContent() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Function to get the cookie value
    const getCookieValue = (name) => {
      const cookies = document.cookie.split("; ");
      for (let cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === name) return value;
      }
      return null;
    };

    // Fetch courses from Firebase Realtime Database
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
            setCourses(Object.values(adminData.courses));
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

  return (
    <div className="Progress-content-cover">
      <h1>Admin Dashboard</h1>
      <div className="Progress-content">
        <h2>Courses</h2>
        <ul>
          {courses.length > 0 ? (
            courses.map((course, index) => (
              <li key={index}>
                <h3>{course.courseName}</h3>
                {/* <p><strong>Author:</strong> {course.authorName}</p> */}
                {/* <p><strong>Number of Modules:</strong> {JSON.parse(course.courseContent).noOfModules}</p> */}
                {/* <p><strong>Introduction:</strong> {JSON.parse(course.courseContent).Introduction}</p> */}
              </li>
            ))
          ) : (
            <p>No courses available.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
