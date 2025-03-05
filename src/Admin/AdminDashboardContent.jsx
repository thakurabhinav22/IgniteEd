import React, { useEffect, useState } from "react";
import { database } from "./firebase";
import { ref, get, remove } from "firebase/database";
import { Trash2, Pencil, BarChart2, Eye } from "lucide-react";
import Swal from "sweetalert2";
import "./AdminDashboardContent.css";

export default function AdminDashboardContent() {
  const [courses, setCourses] = useState([]);
  const ADMIN_ID = "nGqjgrZkivSrNsTfW5l2X1YLJlw1";

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
              courseId: key,
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
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this course? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff4c4c",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    const cookieValue = getCookieValue("userSessionCredAd");
    if (!cookieValue) {
      console.error("No session cookie found!");
      return;
    }

    try {
      const courseRef = ref(database, `admin/${cookieValue}/courses/${courseId}`);
      await remove(courseRef);
      setCourses(courses.filter((course) => course.courseId !== courseId));
      Swal.fire({
        title: "Deleted!",
        text: "The course has been deleted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to delete the course.",
        icon: "error",
      });
    }
  };

  const showStudentDetails = (studentId) => {
    console.log(`Show details for student: ${studentId}`);
    Swal.fire({
      title: `Student Details: ${studentId}`,
      text: "More detailed stats (in Progress)",
      icon: "info",
      confirmButtonText: "Close",
    });
  };

  const showStatsPopup = async (courseId) => {
    try {
      const appliedStudsRef = ref(database, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds`);
      const snapshot = await get(appliedStudsRef);

      let htmlContent = `
        <div style="max-height: 400px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #e9ecef; color: #333333;">
                <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Name</th>
                <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Branch</th>
                <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Current Module</th>
                <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Total Warnings</th>
                <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Critical Warnings</th>
                <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Details</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (snapshot.exists()) {
        const appliedStuds = snapshot.val();
        Object.entries(appliedStuds).forEach(([studentId, studentData]) => {
          const stats = studentData.stats || {};
          htmlContent += `
            <tr style="background-color: #ffffff; color: #333333;">
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${studentData.Name || "Unknown"}</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${studentData.Branch || "Unknown"}</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${stats.currentModule || 1}</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${stats.totalWarning || 0}</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${stats.CriticalWarning || 0}</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                <span class="details-icon" onclick="window.showStudentDetails('${studentId}')" style="cursor: pointer; color: #007bff;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </span>
              </td>
            </tr>
          `;
        });
      } else {
        htmlContent += `
          <tr>
            <td colspan="6" style="padding: 10px; text-align: center; color: #6c757d;">No students applied yet.</td>
          </tr>
        `;
      }

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;

      // Define the global function to handle student details popup
      window.showStudentDetails = (studentId) => {
        Swal.close(); // Close the current popup
        showStudentDetails(studentId); // Open the student details popup
      };

      Swal.fire({
        title: `Stats for Course ID: ${courseId}`,
        html: htmlContent,
        width: "800px",
        showConfirmButton: true,
        confirmButtonText: "Close",
        customClass: {
          popup: "stats-popup",
          title: "stats-title",
          htmlContainer: "stats-content",
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load stats for this course.",
        icon: "error",
      });
    }
  };

  return (
    <div className="Progress-content-cover">
      <h1>Admin Dashboard</h1>
      <div className="Progress-content">
        <h2 className="course">Courses</h2>
        <table className="courses-table">
          <thead className="course-head">
            <tr>
              <th>Sr. No.</th>
              <th>Course Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length > 0 ? (
              courses.map((course, index) => (
                <tr key={course.courseId} className="admin-courses-row">
                  <td>{index + 1}</td>
                  <td>{course.courseName}</td>
                  <td>
                    <span className="tooltip">
                      <BarChart2
                        className="icon stats-icon"
                        onClick={() => showStatsPopup(course.courseId)}
                      />
                      <span className="tooltip-text">View Stats</span>
                    </span>
                    <span className="tooltip">
                      <Pencil className="icon modify-icon" />
                      <span className="tooltip-text">Modify Course</span>
                    </span>
                    <span className="tooltip">
                      <Trash2
                        className="icon delete-icon"
                        onClick={() => deleteCourse(course.courseId)}
                      />
                      <span className="tooltip-text">Delete Course</span>
                    </span>
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