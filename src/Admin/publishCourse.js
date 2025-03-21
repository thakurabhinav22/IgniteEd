// PublishCourse.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "./adminSideBar";
import { FaTimes, FaPlus, FaSearch } from "react-icons/fa";
import { getDatabase, ref, get, set } from "firebase/database";
import Swal from "sweetalert2";
import axios from "axios";
import "./PublicCourse.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PublishCourse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileName, editedContent } = location.state || {};

  const [courseName, setCourseName] = useState(fileName || "");
  const [authorName, setAuthorName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [includeYouTubeLinks, setIncludeYouTubeLinks] = useState(false);
  const [includeMindMaps, setIncludeMindMaps] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [showContentModal, setShowContentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFabModal, setShowFabModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [courseCount, setCourseCount] = useState(0);
  const [updatedContent, setUpdatedContent] = useState(editedContent);

  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  let generatedCourse;

  // Load Google CSE script when component mounts
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cse.google.com/cse.js?cx=13cbaf0acfe7f4937";
    script.async = true;
    document.body.appendChild(script);

    const usercredAd = getCookie("usercredAd");
    if (usercredAd) {
      fetchCourseCount(usercredAd);
    }

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGemini = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const youtubeInstruction = includeYouTubeLinks
        ? "Additionally, provide relevant YouTube video suggestions for each module based on the content. Each module should have at least 2 valid YouTube video URLs directly related to the module’s topic."
        : "Do not include YouTube video suggestions.";

      const mindMapInstruction = includeMindMaps
        ? "Add a 'mindMaps' field for each module with a concise mind map (50-100 words) formatted in Markdown. Use '# ' for main topics and '- ' for subtopics to create a hierarchical structure, organizing the module’s key concepts visually. Include at least one main topic and 2-3 subtopics per module, using emojis (e.g., 🔗, 🏛️) to enhance readability where applicable."
        : "Do not include mind maps.";

      const result = await model.generateContent(`
        Convert the provided course content into a structured JSON format while keeping all data intact. Ensure that no modifications are made to the original content except for formatting it into JSON. Return only JSON, nothing else.
      
        Follow this JSON structure:
      
        {
          "title": "<Course Title>",
          "introduction": "<Course Introduction>",
          "noOfModules": <number_of_modules>,
          "modules": [
            {
              "moduleTitle": "<Module 1 Title>",
              "moduleOverview": "<Module 1 Overview>",
              "detailedExplanation": "<Module 1 Detailed Explanation>",
              "examplesAndAnalogies": "<Module 1 Examples and Analogies>",
              "keyTakeaways": [
                "<Key Takeaway 1>",
                "<Key Takeaway 2>",
                "<Key Takeaway 3>"
              ]${
                includeYouTubeLinks
                  ? `,
                "Refytvideo": [
                  "<YouTube Video URL 1 (no direct url generate using keyowrds [like youtube.com/watch?=blockchain+deatiled+exmplanation])>",
                  "<YouTube Video URL 2 (no direct url generate using keyowrds [like youtube.com/watch?=blockchain+deatiled+exmplanation])>"
                ]`
                  : ""
              }${
        includeMindMaps
          ? `,
                "mindMaps": "<Concise mind map (50-100 words) in Markdown>"
                `
          : ""
      }
            }
          ]
        }
      
         Ensure that:

          The JSON is well-formatted and follows the expected schema precisely.
          The module count reflects the actual number of modules in the content.
          Key takeaways are listed as an array for better readability.
          ${youtubeInstruction}
          ${mindMapInstruction}
          Mind maps should contain detailed and meaningful nodes relevant to the module’s content.
          Avoid generic or placeholder nodes like "undefined", as they provide no value and are redundant across modules.
          Ensure hierarchical structuring is clear, with well-defined main topics and subtopics.
          Each mind map should capture the core concepts effectively while maintaining clarity and conciseness.
          Markdown content should follow a structured format, with proper sectioning:
          Use # for main headings.
          Use ## for subheadings.
          Ensure that explanatory points follow the subheadings, rather than being inline with bullet points.
          Use - for bullet points under subheadings, but keep definitions and descriptions in separate lines.
          Ensure spacing between different sections for readability.
      
        **Course Content:**  
        ${updatedContent}
      `);

      const response = await result.response;
      generatedCourse = await response.text();
      generatedCourse = generatedCourse
        .replace("```json", "")
        .replace("```", "");

      console.log(generatedCourse);
    

      Swal.fire({
        title: "Course Created!",
        icon: "success",
        position: "top",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      }).then(() => {
        setIsProcessing(false);
        navigate("/Admin/Dashboard");
      });
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "An error occurred while generating the course.",
        icon: "error",
      });
      console.log(error);
      setIsProcessing(false);
    }
  };

  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? match[2] : null;
  };

  const fetchCourseCount = async (usercredAd) => {
    const db = getDatabase();
    const courseRef = ref(db, "users/" + usercredAd + "/coursesCount");
    try {
      const snapshot = await get(courseRef);
      if (snapshot.exists()) {
        setCourseCount(snapshot.val());
      } else {
        setCourseCount(0);
      }
    } catch (error) {
      console.error("Error fetching course count:", error);
    }
  };

  const handleThumbnailFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailUrl(URL.createObjectURL(file)); // Preview the image locally
    }
  };

  const uploadImageToCloudinary = async (image) => {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", "unsigned_preset"); // Replace with your Cloudinary upload preset

    try {
      const response = await axios.post(
        "https://api.cloudinary.com/v1_1/ddnkkfmej/image/upload", // Replace 'ddnkkfmej' with your Cloudinary cloud name
        formData
      );
      return response.data.secure_url; // Return the generated URL
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      throw new Error("Failed to upload image to Cloudinary");
    }
  };

  const handlePublish = async () => {
    if (!courseName || !authorName || (!thumbnailUrl && !thumbnailFile)) {
      alert("Please fill all the required fields or upload a thumbnail!");
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await handleGemini();
      const usercredAd = getCookie("userSessionCredAd");
      const userSessionCredAd = getCookie("userSessionCredAd");

      let finalThumbnailUrl = thumbnailUrl;

      // If a file is uploaded, upload it to Cloudinary and get the URL
      if (thumbnailFile) {
        finalThumbnailUrl = await uploadImageToCloudinary(thumbnailFile);
      }

      const db = getDatabase();
      const courseCountRef = ref(db, `admin/${userSessionCredAd}/courseCount`);
      const snapshot = await get(courseCountRef);

      let currentCourseCount = snapshot.exists() ? snapshot.val() : 0;
      currentCourseCount += 1;

      await set(courseCountRef, currentCourseCount);

      const newCourseId = `${usercredAd}${currentCourseCount}`;
      const coursePath = `admin/${usercredAd}/courses/${userSessionCredAd}${currentCourseCount}`;

      const courseData = {
        courseName,
        authorName,
        thumbnailUrl: finalThumbnailUrl || "",
        bannerImageUrl: bannerImageUrl || "",
        numQuestions,
        courseContent: generatedCourse,
      };

      const courseRef = ref(db, coursePath);
      await set(courseRef, courseData);

      await set(ref(db, `Courses/${newCourseId}`), courseData);

      setIsProcessing(false);
      alert("Course Created!");
    } catch (error) {
      setIsProcessing(false);
      console.error("Error during course publishing:", error);
      alert("Error occurred during course creation");
    }
  };

  const handleShowContent = () => {
    setShowContentModal(true);
  };

  const closeModal = () => {
    setShowContentModal(false);
  };

  const handleContentChange = (event) => {
    setUpdatedContent(event.target.value);
  };

  const handleFabClick = () => {
    setShowFabModal(true);
  };

  const closeFabModal = () => {
    setShowFabModal(false);
  };

  const handleSearchClick = () => {
    setShowSearchModal(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
  };

  return (
    <>
      <AdminSidebar />
      <div className="publicCourse-wrapper">
        <div className="form-container">
          <h1>Publish Course</h1>

          <div className="input-group">
            <label>
              <strong>Course Name:</strong>
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Enter course name"
              required
            />
          </div>

          <div className="input-group">
            <label>
              <strong>Author Name:</strong>
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Enter author name"
              required
            />
          </div>

          <div className="input-group">
            <label>
              <strong>Thumbnail Image:</strong>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => {
                  setThumbnailUrl(e.target.value);
                  setThumbnailFile(null); // Clear file if URL is entered
                }}
                placeholder="Enter thumbnail image URL"
              />
              <span>OR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileChange}
              />
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail Preview"
                  style={{ maxWidth: "200px", marginTop: "10px" }}
                />
              )}
            </div>
          </div>

          <div className="input-group">
            <label>
              <strong>Number of Questions per Module:</strong>
            </label>
            <input
              type="number"
              value={numQuestions}
              onChange={(e) =>
                setNumQuestions(
                  Math.max(3, Math.min(10, Number(e.target.value)))
                )
              }
              min="3"
              max="10"
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={includeYouTubeLinks}
                onChange={(e) => setIncludeYouTubeLinks(e.target.checked)}
              />{" "}
              <strong>Include YouTube Video Links</strong>
            </label>
          </div>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={includeMindMaps}
                onChange={(e) => setIncludeMindMaps(e.target.checked)}
              />{" "}
              <strong>Include Mind Maps</strong>
            </label>
          </div>

          <div className="button-group">
            {/* <button
              onClick={() => navigate("/Admin/CreateCourse")}
              className="revert-button"
            >
              Revert to Edit
            </button> */}
            <button onClick={handleShowContent} className="view-content-button">
              View Course Content
            </button>
            <button
              onClick={handlePublish}
              className="publish-button"
              disabled={isProcessing}
            >
              {isProcessing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>

        <button
          className="fab-button fab-plus"
          onClick={handleFabClick}
          title="Quick Actions"
        >
          <FaPlus />
        </button>

        <button
          className="fab-button fab-search"
          onClick={handleSearchClick}
          title="Search"
        >
          <FaSearch />
        </button>
      </div>

      {showContentModal && (
        <div className="pdf-content-overlay">
          <div className="pdf-content-box">
            <button className="close-button" onClick={closeModal}>
              <FaTimes />
            </button>
            <div className="pdf-content-text">
              <pre>{updatedContent}</pre>
            </div>
          </div>
        </div>
      )}

      {showFabModal && (
        <div className="fab-modal-overlay">
          <div className="fab-modal-box">
            <button className="close-button" onClick={closeFabModal}>
              <FaTimes />
            </button>
            <h2>Quick Actions</h2>
            <div className="fab-modal-content">
              <button
                onClick={() => {
                  closeFabModal();
                  handlePublish();
                }}
              >
                Publish Now
              </button>
              <button
                onClick={() => {
                  closeFabModal();
                  handleShowContent();
                }}
              >
                View Content
              </button>
              <button
                onClick={() => {
                  closeFabModal();
                  navigate("/Admin/CreateCourse");
                }}
              >
                Back to Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {showSearchModal && (
        <div className="fab-modal-overlay">
          <div className="fab-modal-box search-modal">
            <button className="close-button" onClick={closeSearchModal}>
              <FaTimes />
            </button>
            <h2>Search</h2>
            <div className="search-container">
              <div className="gcse-search" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublishCourse;