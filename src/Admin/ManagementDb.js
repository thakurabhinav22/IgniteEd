import React, { useState, useEffect } from "react";
import { FaEye, FaTrashAlt, FaPlusCircle } from "react-icons/fa";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
} from "firebase/database";
import Sidebar from "./adminSideBar";
import Swal from "sweetalert2";
import { pdfjs } from "react-pdf";
import "./ManagementDb.css";

export default function ManagementDb() {
  const [showContentModal, setShowContentModal] = useState(false);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfStatuses, setPdfStatuses] = useState({});
  const [viewPdfContent, setViewPdfContent] = useState(null);
  const [manualText, setManualText] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newRepoTitle, setNewRepoTitle] = useState("");
  const [repos, setRepos] = useState([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  // PDF Selection and Processing
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

  const handleViewRepoContent = (repoId) => {
    const db = getDatabase();
    const repoRef = ref(db, `admin/${username}/Database/${repoId}`);

    onValue(repoRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log("Repository Content:", data.content);
        setViewPdfContent(data.content); // Display in the modal
        setShowContentModal(true); // Show the modal
      } else {
        Swal.fire({
          title: "Error",
          text: "This repository has no content to display.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    });
  };


  // Add these states for controlling the content modal

  const closeContentModal = () => {
    setShowContentModal(false); // Close the content modal
  };

  const closeViewRepoContent = () => {
    setViewPdfContent(null); // Close the content view modal
  };

  const handleManualTextChange = (event) => {
    setManualText(event.target.value);
  };

  // Firebase Repository Management
  const addRepo = async () => {
    if (!newRepoTitle.trim()) return alert("Repository title cannot be empty.");
    try {
      const db = getDatabase();
      const userRepoRef = ref(db, `admin/${username}/Database`);
      const newRepoRef = push(userRepoRef);

      const pdfContent = Object.values(pdfStatuses)
        .map((file) => file.content)
        .join("\n\n");

      await set(newRepoRef, {
        title: newRepoTitle,
        content:
          pdfContent +
          (manualText.trim() ? `\n\nManual Input: ${manualText}` : ""),
      });

      fetchRepos();

      setNewRepoTitle("");
      setManualText("");
      setShowUploadModal(false);
    } catch (error) {
      console.error("Error adding repository:", error);
    }
  };

  const fetchRepos = () => {
    const db = getDatabase();
    const userRepoRef = ref(db, `admin/${username}/Database`);
    onValue(
      userRepoRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const reposArray = Object.entries(data).map(([id, repo]) => ({
            id,
            title: repo.title,
            content: repo.content,
          }));
          setRepos(reposArray);
        } else {
          setRepos([]); // Clear repos if no data exists
        }
        setLoading(false); // Stop loading when data is fetched
      },
      (error) => {
        console.error("Error fetching repos:", error);
        setLoading(false); // Stop loading on error
      }
    );
  };

  const handleRemoveRepo = async (repoId) => {
    try {
      const db = getDatabase();
      const repoRef = ref(db, `admin/${username}/Database/${repoId}`);
      await remove(repoRef);
      fetchRepos();
    } catch (error) {
      console.error("Error deleting repository:", error);
    }
  };

  useEffect(() => {
    const cookieValue = getCookieValue("userSessionCredAd");
    if (cookieValue) {
      setUsername(cookieValue);
    }
  }, []);

  useEffect(() => {
    if (username) {
      fetchRepos(); // Fetch repos only after username is set
    }
  }, [username]);

  const getCookieValue = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  };

  return (
    <div className="Repo-page-cover">
      <Sidebar />
      <div className="Repo-container">
        <h1 className="welcome-title">Manage Your Repository</h1>

        {loading ? (
          <div>Loading...</div>
        ) : repos.length === 0 ? (
          <div className="no-database-message">
            <h2>No Database Available</h2>
          </div>
        ) : (
          <table className="repo-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Repository Title</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((repo, index) => (
                <tr key={repo.id}>
                  <td>{index + 1}</td>
                  <td>{repo.title}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleRemoveRepo(repo.id)}
                    >
                      <FaTrashAlt />
                    </button>
                    <button
                      className="view-btn"
                      onClick={() => handleViewRepoContent(repo.id)}
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          className="floating-add-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <FaPlusCircle />
        </button>

        {showUploadModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: "600px" }}>
              <h2>Add Repository</h2>
              <input
                type="text"
                value={newRepoTitle}
                onChange={(e) => setNewRepoTitle(e.target.value)}
                placeholder="Enter repository title"
                className="repo-input"
              />
              <label className="file-upload-label">
                Upload PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfSelect}
                  className="file-input"
                  multiple
                />
              </label>
              <div className="pdf-list">
                {Object.entries(pdfStatuses).map(([fileName, { status }]) => (
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
                      {status !== "Error: Unable to process PDF" && (
                        <button onClick={() => handleViewRepoContent(fileName)}>
                          <FaEye />
                        </button>
                      )}
                      <button onClick={() => handleRemovePdf(fileName)}>
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                value={manualText}
                onChange={handleManualTextChange}
                placeholder="Edit processed content or add manually"
                className="manual-textarea"
              />

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button className="add-btn" onClick={addRepo}>
                  <FaPlusCircle /> Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewPdfContent && (
        <div className="pdf-modal-overlay">
          <div className="pdf-modal-content">
            <div className="modal-close-btn" onClick={closeViewRepoContent}>
              &times;
            </div>
            <pre>{viewPdfContent}</pre>
          </div>
        </div>
      )}
      {showContentModal && (
          <div className="content-modal-overlay">
            <div className="content-modal-content">
              <button className="modal-close-btn" onClick={closeContentModal}>
                &times; {/* Close icon */}
              </button>
              <h2>Repository Content</h2>
              <div className="repo-content">
                <div>
                  {viewPdfContent ? (
                    <p>{viewPdfContent}</p> // Display content in paragraph
                  ) : (
                    <p>No content available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
