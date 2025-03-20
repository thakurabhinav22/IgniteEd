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
import mammoth from "mammoth"; // For Word documents
import { read, utils } from "xlsx"; // Named imports for Excel processing
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
  document.title = "IgnitEd - Admin Course Create ";
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState(AdminName);
  const [adminRole, setAdminRole] = useState(Role);
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const [viewContent, setViewContent] = useState(null);
  const [repoPopup, setRepoPopup] = useState(false);
  const [repoSelected, setRepoSelected] = useState([]);
  const [repoCourses, setRepoCourses] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [courseCreated, setCourseCreated] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);

  useEffect(() => {
    document.title = "IgnitEd - Course Create";
    const userId = Cookies.get("userSessionCredAd");
    if (!userId) {
      navigate("/Admin");
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (files.length > 0) {
      setShowGenerateButton(true);
    } else {
      setShowGenerateButton(false);
    }
  }, [files]);

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

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    selectedFiles.forEach((file) => processFile(file));
  };

  const processFile = async (file) => {
    const fileType = file.name.split('.').pop().toLowerCase();
    
    try {
      let text = "";
      
      if (fileType === 'pdf') {
        text = await processPdf(file);
      } else if (fileType === 'docx') {
        text = await processWord(file);
      } else if (['xls', 'xlsx'].includes(fileType)) {
        text = await processExcel(file);
      } else {
        throw new Error("Unsupported file type (only PDF, DOCX, and Excel are supported)");
      }

      if (text.trim()) {
        setFiles((prev) => [...prev, file]);
        setFileStatuses((prev) => ({
          ...prev,
          [file.name]: { status: "Processed", content: text },
        }));
      } else {
        throw new Error("Empty content");
      }
    } catch (error) {
      setFiles((prev) => [...prev, file]);
      setFileStatuses((prev) => ({
        ...prev,
        [file.name]: { status: `Error: ${error.message}` },
      }));
    }
  };

  const processPdf = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
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
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processWord = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processExcel = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: "array" }); // Use named import 'read'
          let text = "";
          
          // Iterate through all sheets
          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const json = utils.sheet_to_json(sheet, { header: 1 }); // Use named import 'utils'
            json.forEach((row) => {
              row.forEach((cell) => {
                if (cell) text += cell.toString() + " ";
              });
              text += "\n"; // Add newline between rows
            });
          });
          
          resolve(text.trim());
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleRemoveFile = (fileName) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
    setFileStatuses((prev) => {
      const { [fileName]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleViewFile = (fileName) => {
    const content = fileStatuses[fileName]?.content;
    if (content) {
      setViewContent(content);
    } else {
      Swal.fire({
        title: "Error",
        text: "This file has no content to display.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const closeViewContent = () => {
    setViewContent(null);
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

  const addSelectedToFileList = () => {
    const selectedCourses = repoCourses.filter((course) =>
      repoSelected.includes(course.title)
    );
    
    selectedCourses.forEach((course) => {
      if (!files.some((file) => file.name === course.title)) {
        setFiles((prev) => [...prev, { name: course.title }]);
        setFileStatuses((prev) => ({
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
      for (const file of files) {
        const fileContent = fileStatuses[file.name]?.content;
        if (fileContent) {
          combinedContent += fileContent + "\n";
        }
      }

      if (combinedContent.trim()) {
        const result = await model.generateContent(`
          Read the provided content carefully and create a well-structured, module-wise course with clarity and depth. The course should be professionally structured, engaging, and easy to understand. Ensure the following elements are included:
      
          1. **Course Title**: A meaningful and concise title that reflects the essence of the course.  
          2. **Introduction to the Course**: Write a compelling introduction (approximately two paragraphs) that outlines what the course covers, its objectives, and the key skills or knowledge learners will gain. Make it engaging and informative.  
          3. **Modules Breakdown**: Divide the course into well-defined modules, each covering a specific theme or concept. For each module, include:
             - **Module Title**: A clear and precise title reflecting the topic.
             - **Module Overview**: A concise paragraph summarizing what the module covers.
             - **Detailed Explanation**: A comprehensive paragraph explaining the core concepts, methodologies, and key learnings.
             - **Examples & Analogies**: Real-world examples, practical applications, or analogies to enhance understanding and retention.
             - **Key Takeaways**: A bullet-point summary highlighting the most important aspects of the module.
      
          Ensure the language is engaging, professional, and suitable for learners of various levels. Use structured formatting for clarity and readability.
      
          **Content Source:**  
          ${combinedContent}
      `);

        const response = await result.response;
        const generatedCourse = await response.text();

        setFileStatuses((prev) => ({
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
          setShowGenerateButton(false);
        });
      } else {
        Swal.fire({
          title: "Error",
          text: "No content to process from the uploaded files.",
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

  const isAllProcessed = Object.values(fileStatuses).every(
    (status) => status.status === "Processed"
  );

  return (
    <div className="CreateCourse-page-cover">
      <AdminSidebar AdminName={adminName} Role={adminRole} />
      <div className="content">
        <h1 className="create-course-header">Create a New Course</h1>
        <div className="create-course-actions">
          <label className="create-course-button">
            <FaFilePdf /> Select Files
            <input
              type="file"
              accept=".pdf,.docx,.xls,.xlsx"
              multiple
              onChange={handleFileSelect}
              hidden
            />
          </label>

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
          <button className="add-courses-button" onClick={fetchCoursesFromRepo}>
            <FaFolderOpen /> Select from Repository
          </button>
        </div>

        <div className="pdf-list">
          {Object.entries(fileStatuses).map(
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
                  {!status.startsWith("Error") && (
                    <FaEye
                      className="view-icon"
                      onClick={() => handleViewFile(fileName)}
                      title="View File Content"
                    />
                  )}
                  <FaTrashAlt
                    className="delete-icon"
                    onClick={() => handleRemoveFile(fileName)}
                    title="Remove File"
                  />
                </div>
              </div>
            )
          )}
        </div>

        {showGenerateButton && isAllProcessed && !courseCreated && (
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
              onClick={() => handleViewFile("Generated Course")}
            >
              <FaEye style={{ marginRight: "8px" }} />
              View Generated Course
            </button>
            <button
              className="course-action-button edit-button"
              onClick={() => handleEditCourse("Generated Course", fileStatuses["Generated Course"].content)}
            >
              <FaEdit style={{ marginRight: "8px" }} />
              Edit Generated Course
            </button>
          </div>
        )}
      </div>

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
                className="create-course-button-popup"
                onClick={addSelectedToFileList}
                disabled={repoSelected.length === 0}
              >
                Process Selected Courses
              </button>
            </div>
          </div>
        </div>
      )}

      {viewContent && (
        <div className="pdf-content-overlay">
          <div className="pdf-content-box-data">
            <button className="close-button" onClick={closeViewContent}>
              <FaTimes />
            </button>
            <div className="pdf-content-text-data">{viewContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}