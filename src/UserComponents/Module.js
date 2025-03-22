import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import "./Module.css";
import { getDatabase, ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom"; 

function Module() {
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [filter, setFilter] = useState("recent");
   const navigate = useNavigate(); 

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
    navigate(`/courses/learn`, { state: { courseId } });
  };
  

  const filteredCourses = courses
    .filter((course) =>
      course.courseName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (filter === "recent") {
        return new Date(b.uploadDate) - new Date(a.uploadDate);
      }
      if (filter === "mostLiked") {
        return b.likes - a.likes;
      }
      return 0; // Default: no additional sorting
    });

  return (
    <div className="module-container">
      <Sidebar />
      <div className="header-container">
        <h1>Courses</h1>
        <div className="filter-container">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {/* <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="recent">Recently Uploaded</option>
            <option value="mostLiked">Most Liked</option>
            <option value="category">Category</option>
          </select> */}
        </div>
      </div>

      {/* Courses List */}
      <div className="courses-container">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div
              key={course.id}
              className="course-card"
              onClick={() => handleCourseClick(course.id)}
            >
              <img
                src={
                  course.thumbnailUrl ||
                  "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png"
                }
                alt={course.courseName}
                className="course-image"
              />
              <h3 className="course-title">{course.courseName}</h3>
              <p className="course-author">By: {course.authorName}</p>
            </div>
          ))
        ) : (
          <p className="no-results">No courses found.</p>
        )}
      </div>
    </div>
  );
}

export default Module;
