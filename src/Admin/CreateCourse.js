import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import {
  FaFolderOpen,
  FaFilePdf,
  FaTrashAlt,
  FaEye,
  FaTimes,
  FaEdit
} from "react-icons/fa";
import AdminSidebar from "./adminSideBar";
import { pdfjs } from "react-pdf";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ref, onValue } from "firebase/database";
import { database } from "./firebase";
import "./CreateCourse.css";
import loader from "../icons/loader.svg";
import MagicEditor from "../icons/MagicEditor.png";

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Initialize Google AI Model
let API_KEY = process.env.REACT_APP_GEMINI;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export default function CreateCourse({ AdminName, Role }) {
  document.title = "TheLearnMax - Admin Course Create ";
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState(AdminName);
  const [adminRole, setAdminRole] = useState(Role);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfStatuses, setPdfStatuses] = useState({});
  const [viewPdfContent, setViewPdfContent] = useState(null);
  const [repoPopup, setRepoPopup] = useState(false);
  const [repoSelected, setRepoSelected] = useState([]);
  const [repoCourses, setRepoCourses] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [courseCreated, setCourseCreated] = useState(false);

  useEffect(() => {
    document.title = "TheLearnMax - Course Create";
    const userId = Cookies.get("userSessionCredAd");
    if (!userId) {
      navigate("/Admin");
      return;
    }
  }, [navigate]);

  const handleSessionExpired = (message) => {
    Swal.fire({
      title: message,
      icon: "error",
      position: "top",
      toast: true,
      showConfirmButton: false,
      timer: 5000,
    }).then(() => {
      Cookies.remove("userSessionCredAd");
      navigate("/Admin");
    });
  };

  const handlePdfSelect = (event) => {
    const files = Array.from(event.target.files);
    files.forEach((file) => processPdf(file));
  };

  const processPdf = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdfData = new Uint8Array(e.target.result);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;

        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(" ");
        }

        if (text.trim()) {
          setPdfFiles((prev) => [...prev, file]);
          setPdfStatuses((prev) => ({
            ...prev,
            [file.name]: { status: "Processed", content: text },
          }));
        } else {
          throw new Error("Empty content");
        }
      } catch {
        setPdfFiles((prev) => [...prev, file]);
        setPdfStatuses((prev) => ({
          ...prev,
          [file.name]: { status: "Error: Unable to process PDF" },
        }));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemovePdf = (fileName) => {
    setPdfFiles((prev) => prev.filter((file) => file.name !== fileName));
    setPdfStatuses((prev) => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleViewPdf = (fileName) => {
    const content = pdfStatuses[fileName]?.content;
    if (content) {
      setViewPdfContent(content);
    } else {
      Swal.fire({
        title: "Error",
        text: "This PDF has no content to display.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const closeViewPdf = () => {
    setViewPdfContent(null);
  };

  const fetchCoursesFromRepo = () => {
    const adminUid = Cookies.get("userSessionCredAd");
    const coursesRef = ref(database, `admin/${adminUid}/Database`);
    
    onValue(coursesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const coursesArray = Object.entries(data).map(([key, value]) => ({
          title: value.title || key,
          content: value.content
        }));
        setRepoCourses(coursesArray);
        setRepoPopup(true);
      } else {
        setRepoCourses([]);
        setRepoPopup(true);
        Swal.fire({
          title: "No Courses",
          text: "No courses found in the repository",
          icon: "info",
          timer: 2000,
          showConfirmButton: false
        });
      }
    }, (error) => {
      console.error("Error fetching courses:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch courses from repository",
        icon: "error",
      });
    });
  };

  const handleRepoSelection = (courseTitle) => {
    setRepoSelected((prev) =>
      prev.includes(courseTitle)
        ? prev.filter((title) => title !== courseTitle)
        : [...prev, courseTitle]
    );
  };

  const addSelectedToPdfList = () => {
    const selectedCourses = repoCourses.filter((course) =>
      repoSelected.includes(course.title)
    );
    
    selectedCourses.forEach((course) => {
      if (!pdfFiles.some((file) => file.name === course.title)) {
        setPdfFiles((prev) => [...prev, { name: course.title }]);
        setPdfStatuses((prev) => ({
          ...prev,
          [course.title]: { 
            status: "Processed", 
            content: course.content 
          },
        }));
      }
    });
    
    setRepoSelected([]);
    setRepoPopup(false);
  };

  const handleCreateCourse = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let combinedContent = "";
      for (const file of pdfFiles) {
        const pdfContent = pdfStatuses[file.name]?.content;
        if (pdfContent) {
          combinedContent += pdfContent + "\n";
        }
      }

      if (combinedContent.trim()) {
        const result = await model.generateContent(`
         Read the provided PDF content and create a module-wise course in clear and concise language. The course should have a meaningful title ,Introduction to Course (Brief the Course what we will learn from the course it should be about 2 paragraph) and be divided into logical modules, each focusing on specific key concepts, methodologies, findings, and practical applications. For each module, provide a title, a paragrap that covers the entire module concept , a detailed paragraph explanation of the core ideas, and examples or analogies to enhance understanding. 
         
         Content: ${combinedContent}
        `);

        const response = await result.response;
        const generatedCourse = await response.text();

        setPdfStatuses((prev) => ({
          ...prev,
          ["Generated Course"]: {
            status: "Course Created",
            content: generatedCourse,
          },
        }));

        Swal.fire({
          title: "Course Created Successfully!",
          text: "Your course has been generated and is ready for review or editing.",
          icon: "success",
          position: "top",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        }).then(() => {
          setCourseCreated(true);
        });
      } else {
        Swal.fire({
          title: "Error",
          text: "No content to process from the uploaded PDFs.",
          icon: "error",
        });
      }
    } catch (error) {
      console.log(error);
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the course.",
        icon: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditCourse = (fileName, content) => {
    navigate("/admin/magiceditor", {
      state: { fileName, content },
    });
  };

  const isAllProcessed = Object.values(pdfStatuses).every(
    (status) => status.status === "Processed"
  );

  return (
    <div className="CreateCourse-page-cover">
      <AdminSidebar AdminName={adminName} Role={adminRole} />
      <div className="content">
        <h1 className="create-course-header">Create a New Course</h1>
        <div className="create-course-actions">
          <label className="create-course-button">
            <FaFilePdf /> Select PDFs
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handlePdfSelect}
              hidden
            />
          </label>
          <button className="create-course-button" onClick={fetchCoursesFromRepo}>
            <FaFolderOpen /> Select from Repository
          </button>
          <Link to="/Admin/magicWritter">
            <button className="create-course-button">
              <FaEdit /> Magic Writer
            </button>
          </Link>
          <Link to="/Admin/webcrawler">
            <button className="create-course-button">
              <FaEye /> Web Search
            </button>
          </Link>
        </div>

        <div className="pdf-list">
          {Object.entries(pdfStatuses).map(
            ([fileName, { status, content }]) => (
              <div key={fileName} className="pdf-item">
                <span>{fileName}</span>
                <div>
                  <span
                    className={
                      status.startsWith("Error")
                        ? "error-status"
                        : "processed-status"
                    }
                  >
                    {status}
                  </span>
                  {status === "Course Created" && (
                    <img
                      src={MagicEditor}
                      className="edit-icon"
                      onClick={() => handleEditCourse(fileName, content)}
                      title="Edit Course in Magic Editor"
                    />
                  )}
                  {status !== "Error: Unable to process PDF" && (
                    <FaEye
                      className="view-icon"
                      onClick={() => handleViewPdf(fileName)}
                      title="View PDF Content"
                    />
                  )}
                  <FaTrashAlt
                    className="delete-icon"
                    onClick={() => handleRemovePdf(fileName)}
                    title="Remove PDF"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {isAllProcessed && !courseCreated && (
          <button
            className="create-final-button"
            onClick={handleCreateCourse}
            disabled={isProcessing}
            style={{
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            {isProcessing ? (
              <div className="generating-content">
                <span className="generating-text">Generating</span>
                <img src={loader} alt="Loading..." className="loader-icon" />
              </div>
            ) : (
              "Generate Course"
            )}
          </button>
        )}

        {courseCreated && (
          <div className="course-actions">
            <button
              className="course-action-button view-button"
              onClick={() => handleViewPdf("Generated Course")}
            >
              <FaEye style={{ marginRight: "8px" }} />
              View Generated Course
            </button>
            <button
              className="course-action-button edit-button"
              onClick={() => handleEditCourse("Generated Course", pdfStatuses["Generated Course"].content)}
            >
              <FaEdit style={{ marginRight: "8px" }} />
              Edit Generated Course
            </button>
          </div>
        )}
      </div>

      {/* Repository Popup */}
      {repoPopup && (
        <div className="repo-popup">
          <div className="repo-popup-content">
            <button onClick={() => setRepoPopup(false)} className="close-button">
              <FaTimes />
            </button>
            <h2>Select Courses from Repository</h2>
            <ul>
              {repoCourses.map((course) => (
                <li key={course.title}>
                  <input
                    type="checkbox"
                    checked={repoSelected.includes(course.title)}
                    onChange={() => handleRepoSelection(course.title)}
                  />
                  {course.title}
                </li>
              ))}
            </ul>
            <div className="popup-actions">
              <button
                className="create-course-button"
                onClick={addSelectedToPdfList}
                disabled={repoSelected.length === 0}
              >
                Process Selected Courses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF View Modal */}
      {viewPdfContent && (
        <div className="pdf-content-overlay">
          <div className="pdf-content-box">
            <button className="close-button" onClick={closeViewPdf}>
              <FaTimes />
            </button>
            <div className="pdf-content-text">{viewPdfContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}