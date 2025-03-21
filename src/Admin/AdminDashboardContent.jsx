import React, { useEffect, useState } from "react";
import { database } from "./firebase";
import { ref, get, remove } from "firebase/database";
import { Trash2, Pencil, BarChart2, Eye } from "lucide-react";
import Swal from "sweetalert2";
import "./AdminDashboardContent.css";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, RadarController } from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Register Chart.js components, including RadarController
ChartJS.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

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
      // Step 1: Fetch the list of students who applied for this course
      const appliedStudsRef = ref(database, `admin/${cookieValue}/courses/${courseId}/appliedStuds`);
      const snapshot = await get(appliedStudsRef);
      let studentIds = [];

      if (snapshot.exists()) {
        const appliedStuds = snapshot.val();
        studentIds = Object.keys(appliedStuds); // Get the list of student IDs
      }

      // Step 2: Remove the course from each student's InProgressCourses
      const deletePromises = studentIds.map(async (studentId) => {
        const studentCourseRef = ref(database, `user/${studentId}/InProgressCourses/${courseId}`);
        await remove(studentCourseRef);
        console.log(`Course ${courseId} removed from student ${studentId}`);
      });

      // Wait for all student course deletions to complete
      await Promise.all(deletePromises);

      // Step 3: Delete the course from the admin node
      const courseRef = ref(database, `admin/${cookieValue}/courses/${courseId}`);
      await remove(courseRef);

      // Step 4: Delete the course from the Courses node
      const CourseRef = ref(database, `Courses/${courseId}`);
      await remove(CourseRef);

      // Step 5: Update the local state to remove the course from the UI
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

  const showStudentDetails = async (studentId, courseId) => {
    try {
      const studentRef = ref(database, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds/${studentId}`);
      const snapshot = await get(studentRef);

      if (snapshot.exists()) {
        const studentData = snapshot.val();
        const stats = studentData.stats || {};
        const performance = stats.performanceAnalysis || {};

        // Calculate max possible scores (assuming 1 question per type per module)
        const maxScorePerType = stats.currentModule || 1;

        // Prepare radar chart data with distinct colors
        const radarData = {
          labels: ["Remember", "Understand", "Analyze"],
          datasets: [
            {
              label: "Performance",
              data: [
                performance.memoryScore || 0,
                performance.understandingScore || 0,
                performance.analysisScore || 0,
              ],
              backgroundColor: "rgba(34, 139, 34, 0.2)", // Forest Green fill
              borderColor: "rgba(34, 139, 34, 1)", // Forest Green border
              pointBackgroundColor: "rgba(34, 139, 34, 1)",
              pointBorderColor: "#fff",
              pointHoverBackgroundColor: "#fff",
              pointHoverBorderColor: "rgba(34, 139, 34, 1)",
              borderWidth: 2,
            },
          ],
        };

        const radarOptions = {
          scales: {
            r: {
              suggestedMin: 0,
              suggestedMax: maxScorePerType,
              ticks: {
                stepSize: 1,
                font: { size: 12, family: "Arial" },
              },
              pointLabels: {
                font: { size: 14, family: "Arial", weight: "bold" },
              },
              grid: { color: "#e0e0e0" },
            },
          },
          plugins: {
            legend: {
              labels: {
                font: { size: 14, family: "Arial" },
                color: "#333",
              },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleFont: { size: 14, family: "Arial" },
              bodyFont: { size: 12, family: "Arial" },
            },
          },
        };

        // Professional HTML content
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="color: #2c3e50; margin: 0 0 15px; font-size: 20px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
              ${studentData.Name || "Unknown"}
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #555;"><strong style="color: #2c3e50;">Branch:</strong> ${studentData.Branch || "Unknown"}</p>
              <p style="margin: 5px 0; color: #555;"><strong style="color: #2c3e50;">Current Module:</strong> ${stats.currentModule || 1}</p>
              <p style="margin: 5px 0; color: #555;"><strong style="color: #2c3e50;">Total Warnings:</strong> ${stats.totalWarning || 0}</p>
              <p style="margin: 5px 0; color: #555;"><strong style="color: #2c3e50;">Critical Warnings:</strong> ${stats.criticalWarning || 0}</p>
              <p style="margin: 5px 0; color: #555;"><strong style="color: #2c3e50;">Questions Answered:</strong> ${performance.totalQuestionsAnswered || 0}</p>
              <p style="margin: 5px 0; color: #555;"><strong style="color: #2c3e50;">Correct Answers:</strong> ${performance.correctAnswers || 0}</p>
            </div>
            <p style="margin: 5px 0; color: #555; font-size: 16px;"><strong style="color: #2c3e50;">Accuracy:</strong> ${performance.accuracy ? performance.accuracy.toFixed(2) : 0}%</p>
            <h4 style="color: #2c3e50; margin: 20px 0 10px; font-size: 18px;">Performance Breakdown</h4>
            <div id="radarChartContainer" style="width: 100%; max-width: 450px; margin: 0 auto; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <canvas id="radarChart"></canvas>
            </div>
          </div>
        `;

        Swal.fire({
          title: `<span style="color: #2c3e50; font-family: Arial, sans-serif;">Student Performance Report</span>`,
          html: htmlContent,
          width: "700px",
          showConfirmButton: true,
          confirmButtonText: "Close",
          confirmButtonColor: "#3498db",
          customClass: {
            popup: "professional-popup",
            title: "professional-title",
            htmlContainer: "professional-content",
          },
          didOpen: () => {
            const canvas = document.getElementById("radarChart");
            const ctx = canvas.getContext("2d");
            new ChartJS(ctx, {
              type: "radar",
              data: radarData,
              options: radarOptions,
            });
          },
        });
      } else {
        Swal.fire({
          title: "Error",
          text: "Student data not found.",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error fetching student details:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load student details.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  const showStatsPopup = async (courseId) => {
    try {
      const appliedStudsRef = ref(database, `admin/${ADMIN_ID}/courses/${courseId}/appliedStuds`);
      const snapshot = await get(appliedStudsRef);

      let htmlContent = `
        <div style="max-height: 400px; overflow-y: auto; font-family: Arial, sans-serif;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #2c3e50; color: #ffffff;">
                <th style="padding: 12px; border-bottom: 2px solid #34495e;">Name</th>
                <th style="padding: 12px; border-bottom: 2px solid #34495e;">Branch</th>
                <th style="padding: 12px; border-bottom: 2px solid #34495e;">Current Module</th>
                <th style="padding: 12px; border-bottom: 2px solid #34495e;">Total Warnings</th>
                <th style="padding: 12px; border-bottom: 2px solid #34495e;">Critical Warnings</th>
                <th style="padding: 12px; border-bottom: 2px solid #34495e;">Details</th>
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
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${studentData.Name || "Unknown"}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${studentData.Branch || "Unknown"}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${stats.currentModule || 1}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${stats.totalWarning || 0}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${stats.criticalWarning || 0}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
                <span class="details-icon" onclick="window.showStudentDetails('${studentId}', '${courseId}')" style="cursor: pointer; color: #3498db;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </span>
              </td>
            </tr>
          `;
        });
      } else {
        htmlContent += `
          <tr>
            <td colspan="6" style="padding: 12px; text-align: center; color: #6c757d;">No students applied yet.</td>
          </tr>
        `;
      }

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;

      window.showStudentDetails = (studentId, courseId) => {
        Swal.close();
        showStudentDetails(studentId, courseId);
      };

      Swal.fire({
        title: `<span style="color: #2c3e50; font-family: Arial, sans-serif;">Student Stats for Course ID: ${courseId}</span>`,
        html: htmlContent,
        width: "900px",
        showConfirmButton: true,
        confirmButtonText: "Close",
        confirmButtonColor: "#3498db",
        customClass: {
          popup: "professional-popup",
          title: "professional-title",
          htmlContainer: "professional-content",
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load stats for this course.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  return (
    <div className="Progress-content-cover" style={{ background: "#f4f6f9", padding: "20px", borderRadius: "8px" }}>
      <h1 style={{ color: "#2c3e50", fontFamily: "Arial, sans-serif", marginBottom: "20px" }}>Admin Dashboard</h1>
      <div className="Progress-content" style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <h2 className="course" style={{ color: "#3498db", fontFamily: "Arial, sans-serif" }}>Courses</h2>
        <table className="courses-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead className="course-head" style={{ background: "#2c3e50", color: "#fff" }}>
            <tr>
              <th style={{ padding: "12px" }}>Sr. No.</th>
              <th style={{ padding: "12px" }}>Course Name</th>
              <th style={{ padding: "12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length > 0 ? (
              courses.map((course, index) => (
                <tr key={course.courseId} className="admin-courses-row" style={{ borderBottom: "1px solid #e0e0e0" }}>
                  <td style={{ padding: "12px", color: "#333" }}>{index + 1}</td>
                  <td style={{ padding: "12px", color: "#333" }}>{course.courseName}</td>
                  <td style={{ padding: "12px" }}>
                    <span className="tooltip">
                      <BarChart2
                        className="icon stats-icon"
                        onClick={() => showStatsPopup(course.courseId)}
                        style={{ color: "#3498db", cursor: "pointer" }}
                      />
                      <span className="tooltip-text">View Stats</span>
                    </span>
                    {/* <span className="tooltip">
                      <Pencil className="icon modify-icon" style={{ color: "#f39c12", cursor: "pointer" }} />
                      <span className="tooltip-text">Modify Course</span>
                    </span> */}
                    <span className="tooltip">
                      <Trash2
                        className="icon delete-icon"
                        onClick={() => deleteCourse(course.courseId)}
                        style={{ color: "#e74c3c", cursor: "pointer" }}
                      />
                      <span className="tooltip-text">Delete Course</span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="no-courses" style={{ padding: "12px", textAlign: "center", color: "#6c757d" }}>
                  No courses available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}