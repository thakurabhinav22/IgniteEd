import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { FaFolderOpen, FaFilePdf, FaTrashAlt, FaEye, FaTimes } from "react-icons/fa";
import AdminSidebar from "./adminSideBar";
import { pdfjs } from "react-pdf";
import "./CreateCourse.css";

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function CreateCourse() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
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

  useEffect(() => {
    document.title = "TheLearnMax - Admin Dashboard";
    const userId = Cookies.get("userSessionCredAd");

    if (!userId) {
      navigate("/Admin");
      return;
    }

    // Dummy admin session check
    setAdminName("Admin");
    setAdminRole("Administrator");
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
      prev.includes(fileName) ? prev.filter((name) => name !== fileName) : [...prev, fileName]
    );
  };

  const addSelectedToPdfList = () => {
    const selectedCourses = repoDummyData.filter((course) => repoSelected.includes(course.name));
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

  const isAllProcessed = Object.values(pdfStatuses).every((status) => status.status === "Processed");

  return (
    <div className="CreateCourse-page-cover">
      <AdminSidebar AdminName={adminName} Role={adminRole} />
      <div className="content">
        <h1 className="create-course-header">Create a New Course</h1>
        <div className="create-course-actions">
          <label className="create-course-button">
            <FaFilePdf /> Select PDFs
            <input type="file" accept="application/pdf" multiple onChange={handlePdfSelect} hidden />
          </label>
          <button className="create-course-button" onClick={toggleRepoPopup}>
            <FaFolderOpen /> Select from Repository
          </button>
        </div>

        <div className="pdf-list">
          {Object.entries(pdfStatuses).map(([fileName, { status }]) => (
            <div key={fileName} className="pdf-item">
              <span>{fileName}</span>
              <div>
                <span
                  className={status.startsWith("Error") ? "error-status" : "processed-status"}
                >
                  {status}
                </span>
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
          ))}
        </div>

        {isAllProcessed && (
          <button className="create-final-button">Create Course</button>
        )}

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

        {repoPopup && (
          <div className="repo-popup">
            <div className="repo-popup-content">
              <button className="close-button" onClick={toggleRepoPopup}>
                <FaTimes />
              </button>
              <h2>Select Courses from Repository</h2>
              <ul>
                {repoDummyData.map(({ name, content }) => (
                  <li key={name}>
                    <label>
                      <input
                        type="checkbox"
                        checked={repoSelected.includes(name)}
                        onChange={() => handleRepoSelection(name)}
                        // onChange = {() => addSelectedToPdfList}
                      />
                      {name}
                    </label>
                    {/* <FaEye
                      className="view-icon"
                      onClick={() => handleViewPdf(name)}
                      title="View Content"
                    /> */}
                  </li>
                ))}
              </ul>
              <button className="add-courses-button" onClick={addSelectedToPdfList}>
                Add Selected Courses
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
