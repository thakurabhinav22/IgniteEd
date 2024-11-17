import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "./firebase";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { FaFolderOpen, FaFilePdf, FaTrashAlt } from "react-icons/fa";
import AdminSidebar from "./adminSideBar";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "./CreateCourse.css";

// Set PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function CreateCourse() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfContents, setPdfContents] = useState([]); // To store extracted content

  useEffect(() => {
    document.title = "TheLearnMax - Admin Dashboard";
    const userId = Cookies.get("userSessionCredAd");

    if (!userId) {
      navigate("/Admin");
      return;
    }

    const adminRef = ref(database, `admin/${userId}`);
    get(adminRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.isAdmin) {
            setAdminName(userData.Name || "Admin");
            setAdminRole(userData.Role || "Administrator");
          } else {
            showSessionExpiredMessage("Something Went Wrong. Please Login Again");
          }
        } else {
          showSessionExpiredMessage("Invalid Admin Session.");
        }
      })
      .catch((error) => {
        console.error("Error checking admin access:", error);
        showSessionExpiredMessage("An error occurred while checking your status.");
      });
  }, [navigate]);

  const showSessionExpiredMessage = (errorMessage) => {
    Swal.fire({
      title: errorMessage,
      icon: "error",
      position: "top",
      toast: true,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    }).then(() => {
      Cookies.remove("userSessionCredAd");
      navigate("/Admin");
    });
  };

  const handleCreateFromRepo = () => {
    alert("Create from Repository clicked!");
  };

  const handlePdfSelect = (event) => {
    const files = Array.from(event.target.files);

    const validPdfs = files.filter((file) => file.type === "application/pdf");

    if (validPdfs.length !== files.length) {
      Swal.fire({
        title: "Invalid File(s) Selected",
        text: "Only PDF files are allowed.",
        icon: "warning",
        confirmButtonText: "OK",
      });
    }

    setPdfFiles((prev) => [...prev, ...validPdfs]);
  };

  const handleDeletePdf = (index) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const extractTextFromPdf = async (file) => {
    const fileReader = new FileReader();
    return new Promise((resolve) => {
      fileReader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str).join(" ");
          
          // Remove page number from the text
          const cleanedText = pageText.replace(/^Page \d+:\n/g, ""); // Remove 'Page x:' from start of each page

          text += `${cleanedText}\n\n`; // Append cleaned text
        }
        resolve(text);
      };
      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleCreateCourse = async () => {
    if (pdfFiles.length === 0) {
      Swal.fire({
        title: "No PDFs Selected",
        text: "Please select at least one PDF to create a course.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const allContents = [];
    for (let file of pdfFiles) {
      const text = await extractTextFromPdf(file);
      allContents.push({ name: file.name, content: text });
    }

    setPdfContents(allContents); // Store the content for rendering
    Swal.fire({
      title: "Course Created",
      text: "All selected PDFs have been processed and displayed below.",
      icon: "success",
      confirmButtonText: "OK",
    });
  };

  return (
    <div className="CreateCourse-page-cover">
      <AdminSidebar AdminName={adminName} Role={adminRole} />
      <div className="content">
        <h1 className="create-course-header">Create a New Course</h1>
        <div className="create-course-actions">
          {/* Button for creating from repository */}
          <button
            className="create-course-button"
            onClick={handleCreateFromRepo}
          >
            <FaFolderOpen className="icon" />
            Create from Repository
          </button>

          {/* Button for selecting PDFs */}
          <label className="create-course-button">
            <FaFilePdf className="icon" />
            Select PDFs
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handlePdfSelect}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Display selected PDF files */}
        <div className="pdf-list">
          {pdfFiles.map((file, index) => (
            <div key={index} className="pdf-item">
              <span>{file.name}</span>
              <FaTrashAlt
                className="delete-icon"
                onClick={() => handleDeletePdf(index)}
              />
            </div>
          ))}
        </div>

        {/* Create Course Button */}
        <button
          className="create-course-button create-final-button"
          onClick={handleCreateCourse}
        >
          Create Course
        </button>

        {/* Display extracted PDF content */}
        {pdfContents.length > 0 && (
          <div className="pdf-content-display">
            <h2>Extracted PDF Content:</h2>
            {pdfContents.map((pdf, index) => (
              <div key={index} className="pdf-content-item">
                <h3>{pdf.name}</h3>
                <div className="pdf-content-text">
                  <pre>{pdf.content}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
