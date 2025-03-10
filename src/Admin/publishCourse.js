import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "./adminSideBar";
import { FaTimes } from "react-icons/fa";
import { getDatabase, ref, get, set } from "firebase/database";
import Swal from "sweetalert2";
import "./PublicCourse.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PublishCourse = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileName, editedContent } = location.state || {};

  const [courseName, setCourseName] = useState(fileName || "");
  const [authorName, setAuthorName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [createAnnouncement, setCreateAnnouncement] = useState(false);
  const [numQuestions, setNumQuestions] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [courseCount, setCourseCount] = useState(0);
  const [updatedContent, setUpdatedContent] = useState(editedContent);

  const API_KEY = process.env.REACT_APP_GEMINI;
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  let generatedCourse;

  const handleGemini = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await model.generateContent(`
        Convert the provided course content into a structured JSON format while keeping all data intact. Ensure that no modifications are made to the original content except for formatting it into JSON. Return only JSON, nothing else. Additionally, provide relevant YouTube video suggestions for each module based on the content video should exist in youtube.
      
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
              ],
              "Refytvideo": [
                "<YouTube Video URL 1>",
                "<YouTube Video URL 2>"
              ]
            },
            {
              "moduleTitle": "<Module 2 Title>",
              "moduleOverview": "<Module 2 Overview>",
              "detailedExplanation": "<Module 2 Detailed Explanation>",
              "examplesAndAnalogies": "<Module 2 Examples and Analogies>",
              "keyTakeaways": [
                "<Key Takeaway 1>",
                "<Key Takeaway 2>",
                "<Key Takeaway 3>"
              ],
              "Refytvideo": [
                "<YouTube Video URL 1>",
                "<YouTube Video URL 2>"
              ]
            }
            // Additional modules will follow the same structure
          ]
        }
      
        Ensure that:
        - The JSON is well-formatted and follows the above schema precisely.
        - The module count reflects the actual number of modules in the content.
        - Key takeaways are listed as an array for better readability.
        - YouTube video suggestions are relevant to the module's content and provide additional learning resources.
        - Each module should have at least 2 YouTube video suggestions.
        - YouTube video URLs should be valid and directly related to the module's topic.
      
        **Course Content:**  
        ${updatedContent}
      `);

      const response = await result.response;
      generatedCourse = await response.text();
      generatedCourse = generatedCourse.replace("```json", "");
      generatedCourse = generatedCourse.replace("```", "");

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
        navigate("/Admin/Dashboard")
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

  useEffect(() => {
    const usercredAd = getCookie("usercredAd");
    if (usercredAd) {
      fetchCourseCount(usercredAd);
    }
  }, []);

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

  const handlePublish = async () => {
    if (!courseName || !authorName || !thumbnailUrl) {
      alert("Please fill all the required fields!");
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await handleGemini();
      const usercredAd = getCookie("userSessionCredAd");
      const userSessionCredAd = getCookie("userSessionCredAd");

      const db = getDatabase();
      const courseCountRef = ref(db, `admin/${userSessionCredAd}/courseCount`);
      const snapshot = await get(courseCountRef);

      let currentCourseCount = snapshot.exists() ? snapshot.val() : 0;
      currentCourseCount += 1;

      await set(courseCountRef, currentCourseCount);

      const newCourseId = `${usercredAd}${currentCourseCount}`;

      const coursePath = `admin/${usercredAd}/courses/${userSessionCredAd}${currentCourseCount}`;

      const courseRef = ref(db, coursePath);
      await set(courseRef, {
        courseName,
        authorName,
        thumbnailUrl,
        bannerImageUrl,
        numQuestions,
        courseContent: generatedCourse,
      });

      await set(ref(db, `Courses/${newCourseId}`), {
        courseName,
        authorName,
        thumbnailUrl,
        bannerImageUrl,
        numQuestions,
        courseContent: generatedCourse,
      });

      setIsProcessing(false);
      alert("Course Created!");
    } catch (error) {
      setIsProcessing(false);
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

  return (
    <>
      <AdminSidebar />
      <div className="publicCourse-wrapper">
        <div className="form-container">
          <h1>Publish Course</h1>

          {/* Course Name */}
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

          {/* Author Name */}
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

          {/* Thumbnail URL */}
          <div className="input-group">
            <label>
              <strong>Thumbnail Image URL:</strong>
            </label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Enter thumbnail image URL"
              required
            />
          </div>



          {/* Number of Questions per Module */}
          <div className="input-group">
            <label>
              <strong>Number of Questions per Module:</strong>
            </label>
            <input
              type="number"
              value={5}
              onChange={(e) => setNumQuestions(Math.max(1, e.target.value))}
              min="3"
              max="10"
            />
          </div>

          {/* Show Course Content Button */}
          <div className="button-group">
            <button
              onClick={() => navigate("/Admin/CreateCourse")}
              className="revert-button"
            >
              Revert to Edit
            </button>
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
      </div>

      {/* Modal for Course Content */}
      {showContentModal && (
        <div className="pdf-content-overlay">
          <div className="pdf-content-box">
            <button className="close-button" onClick={closeModal}>
              <FaTimes />
            </button>
            <div className="pdf-content-text">
              {/* <textarea
                value={updatedContent}
                onChange={handleContentChange}
                rows="10"
                cols="50"
              /> */}
              <pre>{updatedContent}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublishCourse;