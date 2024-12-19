import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
// require('dotenv').config()
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
import "./CreateCourse.css";
import loader from "../icons/loader.svg";
import MagicEditor from "../icons/MagicEditor.png";

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Initialize Google AI Model
let API_KEY =  process.env.REACT_APP_GEMINI

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
  const [repoDummyData, setRepoDummyData] = useState([
    { name: "Course 1", content: "Dummy content for course 1" },
    { name: "Course 2", content: "Dummy content for course 2" },
    { name: "Course 3", content: "Dummy content for course 3" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false); // Track if AI is processing
  const [courseCreated, setCourseCreated] = useState(false); // Track if course is created

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

  const toggleRepoPopup = () => {
    setRepoPopup(!repoPopup);
  };

  const handleRepoSelection = (fileName) => {
    setRepoSelected((prev) =>
      prev.includes(fileName)
        ? prev.filter((name) => name !== fileName)
        : [...prev, fileName]
    );
  };

  const addSelectedToPdfList = () => {
    const selectedCourses = repoDummyData.filter((course) =>
      repoSelected.includes(course.name)
    );
    selectedCourses.forEach((course) => {
      if (!pdfFiles.some((file) => file.name === course.name)) {
        setPdfFiles((prev) => [...prev, { name: course.name }]);
        setPdfStatuses((prev) => ({
          ...prev,
          [course.name]: { status: "Processed", content: course.content },
        }));
      }
    });
    toggleRepoPopup(); // Close the popup after adding the courses
  };

  const handleCreateCourse = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    setIsProcessing(true);

    try {
      let combinedContent = ""; // Initialize a variable to store all PDF content

      // Concatenate all PDF content
      for (const file of pdfFiles) {
        const pdfContent = pdfStatuses[file.name]?.content;
        if (pdfContent) {
          combinedContent += pdfContent + "\n"; // Add content and a newline for separation
        }
      }

      if (combinedContent.trim()) {
        // Generate course content using AI for the combined content
        const result = await model.generateContent(`
         Read the provided PDF content and create a module-wise course in clear and concise language. The course should have a meaningful title and be divided into logical modules, each focusing on specific key concepts, methodologies, findings, and practical applications. For each module, provide a title, a paragrap that covers the entire module concept , a detailed paragraph explanation of the core ideas, and examples or analogies to enhance understanding. 
        
         Content: ${combinedContent}
        `);

        const response = await result.response;
        const generatedCourse = await response.text();
        

        // Save the generated course text
        setPdfStatuses((prev) => ({
          ...prev,
          ["Generated Course"]: {
            status: "Course Created",
            content: generatedCourse,
          },
        }));

        // Show SweetAlert message for course creation
        Swal.fire({
          title: "Course Created!",
          icon: "success",
          position: "top",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        }).then(() => {
          setCourseCreated(true);
          // console.log("Generated Course:", generatedCourse);
        });
      } else {
        Swal.fire({
          title: "Error",
          text: "No content to process from the uploaded PDFs.",
          icon: "error",
        });
      }
    } catch (error) {
      console.log(error)
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
          <button className="create-course-button" onClick={toggleRepoPopup}>
            <FaFolderOpen /> Select from Repository
          </button>
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
                    <img src= {MagicEditor}
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
      </div>

      {/* Repository Popup */}
      {repoPopup && (
        <div className="repo-popup">
          <div className="repo-popup-content">
            <button onClick={toggleRepoPopup} className="close-button">
              <FaTimes />
            </button>
            <h2>Select Courses from Repository</h2>
            <ul>
              {repoDummyData.map((repo) => (
                <li key={repo.name}>
                  <input
                    type="checkbox"
                    checked={repoSelected.includes(repo.name)}
                    onChange={() => handleRepoSelection(repo.name)}
                  />
                  {repo.name}
                </li>
              ))}
            </ul>
            <div className="popup-actions">
              <button
                className="create-course-button"
                onClick={addSelectedToPdfList}
              >
                Add Selected Courses
              </button>
              {/* <button onClick={toggleRepoPopup}>Close</button> */}
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
