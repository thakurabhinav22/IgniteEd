import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import "./Module.css";
// import placeholderImage from './placeholder.png'; // Replace with a valid placeholder image URL or path
import { getDatabase, ref, onValue } from "firebase/database";

function Module() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const db = getDatabase();
    const coursesRef = ref(db, "/Courses/");
    onValue(coursesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const coursesArray = Object.entries(data).map(([id, course]) => ({
          id,
          ...course,
        }));
        setCourses(coursesArray);
      }
    });
  }, []);

  const handleCourseClick = (courseId) => {
    console.log("Selected Course ID:", courseId);
  };

  return (
    <div className="module-container">
      <Sidebar />
      <div className="courses-container">
        {courses.map((course) => (
          <div
            key={course.id}
            className="course-card"
            onClick={() => handleCourseClick(course.id)}
          >
            <img
              src={
                course.imageURL ||
                "https://academy.hackthebox.com/storage/modules/185/logo.png"
              }
              alt={course.courseName}
              className="course-image"
            />
            <h3 className="course-title">{course.courseName}</h3>
            <p className="course-author">By: {course.authorName}</p>
            
          </div>
        ))}
      </div>
    </div>
  );
}

export default Module;
