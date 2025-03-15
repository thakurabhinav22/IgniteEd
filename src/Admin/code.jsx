import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { getDatabase, ref, onValue } from "firebase/database";
import "./code.css";
import AdminSidebar from "./adminSideBar";
import { database } from "./firebase"; // Adjust the path to your firebase.js file

// Bind modal to your appElement for accessibility
Modal.setAppElement("#root");

// Import Firebase configuration (assuming it's set up in firebase.js)

export default function Code() {
  const [form, setForm] = useState({
    title: "",
    explanation: "",
    example: "",
    constraints: "",
    inputFormat: "",
    outputFormat: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const cookieValue = "nGqjgrZkivSrNsTfW5l2X1YLJlw1"; // Replace with dynamic cookie value if needed

  // Fetch all items from Firebase Realtime Database
  useEffect(() => {
    let unsubscribe;
    if (isModalOpen) {
      const databaseRef = ref(database, `admin/${encodeURIComponent(cookieValue)}/Database/`);
      unsubscribe = onValue(
        databaseRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // Flatten the data into an array of items with id and title
            const items = [];
            Object.keys(data).forEach((key) => {
              const itemData = data[key];
              if (typeof itemData === "object" && itemData !== null) {
                // Handle nested objects (e.g., courses with titles)
                items.push({
                  id: key,
                  title: itemData.title || `Session ${key}`, // Fallback title
                  description: itemData.description || "", // Optional field
                });
              } else {
                // Handle flat values (if any)
                items.push({
                  id: key,
                  title: itemData?.toString() || `Item ${key}`,
                });
              }
            });
            setCourses(items);
          } else {
            setCourses([]);
            console.log("No items found in the repository.");
          }
        },
        (error) => {
          console.error("Error fetching items:", error);
          setCourses([]);
        }
      );
    }
    // Cleanup the listener when the modal closes or component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isModalOpen, cookieValue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.title) newErrors.title = "Title is required";
    if (!form.explanation) newErrors.explanation = "Explanation is required";
    if (!form.example) newErrors.example = "Example is required";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setTimeout(() => {
        console.log("Question Created:", { ...form, selectedCourses });
        alert("Coding question created successfully!");
        setIsSubmitting(false);
        setForm({
          title: "",
          explanation: "",
          example: "",
          constraints: "",
          inputFormat: "",
          outputFormat: "",
        });
        setSelectedCourses([]);
      }, 1000); // Simulate API call
    } else {
      setErrors(newErrors);
    }
  };

  const handleRepoClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleCheckboxChange = (courseId) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  return (
    <>
      <AdminSidebar />
      <div className="code-container">
        <div className="header">
          <h1>Coding Question Manager</h1>
          <p className="subtitle">Create and manage coding challenges with ease</p>
        </div>
        <button className="repo-button" onClick={handleRepoClick}>
          Select from Repository
        </button>

        <form className="question-form" onSubmit={handleSubmit}>
          <h2 className="form-title">Create New Coding Question</h2>

          <div className="form-group">
            <label htmlFor="title">Question Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter a concise question title"
              required
              className={errors.title ? "error" : ""}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="explanation">Explanation *</label>
            <textarea
              id="explanation"
              name="explanation"
              value={form.explanation}
              onChange={handleChange}
              placeholder="Provide a detailed explanation"
              required
              className={errors.explanation ? "error" : ""}
            ></textarea>
            {errors.explanation && (
              <span className="error-message">{errors.explanation}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="example">Example *</label>
            <textarea
              id="example"
              name="example"
              value={form.example}
              onChange={handleChange}
              placeholder="Provide a sample input and output"
              required
              className={errors.example ? "error" : ""}
            ></textarea>
            {errors.example && <span className="error-message">{errors.example}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="constraints">Constraints</label>
            <textarea
              id="constraints"
              name="constraints"
              value={form.constraints}
              onChange={handleChange}
              placeholder="List any constraints (e.g., time limits)"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="inputFormat">Input Format</label>
            <textarea
              id="inputFormat"
              name="inputFormat"
              value={form.inputFormat}
              onChange={handleChange}
              placeholder="Describe the input format"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="outputFormat">Output Format</label>
            <textarea
              id="outputFormat"
              name="outputFormat"
              value={form.outputFormat}
              onChange={handleChange}
              placeholder="Describe the output format"
            ></textarea>
          </div>

          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Question"}
          </button>
          {isSubmitting && <div className="progress-bar"></div>}
        </form>

        {/* Popup Modal */}
        <Modal
          isOpen={isModalOpen}
          onRequestClose={handleModalClose}
          className="modal"
          overlayClassName="modal-overlay"
        >
          <div className="modal-header">
            <h2>Select Items from Repository</h2>
            <button className="modal-close-button" onClick={handleModalClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-item">
                  <input
                    type="checkbox"
                    id={`course-${course.id}`}
                    checked={selectedCourses.includes(course.id)}
                    onChange={() => handleCheckboxChange(course.id)}
                  />
                  <label htmlFor={`course-${course.id}`}>
                    {course.title} {course.description && `- ${course.description}`}
                  </label>
                </div>
              ))
            ) : (
              <p>No items found in the repository. Please check your Firebase data.</p>
            )}
          </div>
          <div className="modal-footer">
            <button className="modal-button cancel" onClick={handleModalClose}>
              Cancel
            </button>
            <button
              className="modal-button confirm"
              onClick={() => {
                console.log("Selected Items:", selectedCourses);
                handleModalClose();
              }}
            >
              Confirm Selection
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
}