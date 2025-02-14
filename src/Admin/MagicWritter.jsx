import React, { useState, useEffect, useRef } from "react";
import "./MagicWritter.css";
import AdminSidebar from "./adminSideBar";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";
import loading from "../icons/Loading.gif";
import { BiPencil, BiRefresh, BiMicrophone, BiSend } from "react-icons/bi";

function MagicWritter() {
    const [courseContent, setCourseContent] = useState("");
    const [lineNumbers, setLineNumbers] = useState([1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalText, setModalText] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);


    // Dynamic line numbering with scroll sync
    useEffect(() => {
        const updateLineNumbers = () => {
            const lines = courseContent.split("\n").length || 1;
            setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
        };

        const handleScroll = () => {
            if (textareaRef.current && lineNumbersRef.current) {
                lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
            }
        };

        updateLineNumbers();
        const textarea = textareaRef.current;
        textarea.addEventListener("scroll", handleScroll);

        return () => textarea.removeEventListener("scroll", handleScroll);
    }, [courseContent]);

    const handleChange = (e) => {
        const newContent = e.target.value;
        setCourseContent(newContent);

        // Detect if '##' is typed and show the modal
        if (newContent.includes("##") && !isModalOpen) {
            setIsModalOpen(true);
        }
    };

    const handleModalSubmit = () => {
        // Call AI to generate response based on modal text
        generateAIResponse(modalText);
        setIsModalOpen(false); // Close the modal after submitting
    };

    const generateAIResponse = async (text) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setIsLoading(true); // Show loading GIF

        try {
            const generatedContent = await handleGemini(text);
            setAiResponse(generatedContent); // Set AI response in the state
            setIsProcessing(false);
            setIsLoading(false); // Hide loading GIF

            Swal.fire({
                title: "AI Generated!",
                icon: "success",
                position: "top",
                toast: true,
                showConfirmButton: false,
                timer: 3000,
            });
        } catch (error) {
            setIsProcessing(false);
            setIsLoading(false); // Hide loading GIF
            Swal.fire({
                title: "Error",
                text: "An error occurred while generating the response.",
                icon: "error",
            });
            console.log(error);
        }
    };

    const handleGemini = async (inputText) => {
        try {
            const API_KEY = process.env.REACT_APP_GEMINI;
            const genAI = new GoogleGenerativeAI(API_KEY);

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(inputText);
            const response = await result.response;
            let generatedText = await response.text();
            return generatedText;
        } catch (error) {
            console.error("Error generating text:", error);
            return "Error occurred while generating text.";
        }
    };

    const handleTextAreaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    // Insert the AI response into the course content
    const insertText = () => {
        setCourseContent(prevContent => prevContent.replace("##", aiResponse));
        setAiResponse(""); // Clear the AI response after inserting
    };

    // Regenerate the AI response with the current modal text
    // Regenerate AI content based on modal text
    const regenerateContent = () => {
        setAiResponse(""); // Clear the current AI response
        setIsModalOpen(false); // Close the modal
        generateAIResponse(modalText); // Regenerate AI content based on the new modal text
    };


    return (
        <div className="magic-writter-container">
            
                <AdminSidebar />
            <div className="editor-container">
                <div className="editor">
                    <div className="editor-header">
                        <h2>Magic Writer</h2>
                    </div>
                    <div className="editor-body">
                        <div className="line-numbers" ref={lineNumbersRef}>
                            {lineNumbers.map((num) => (
                                <div key={num}>{num}</div>
                            ))}
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="course-textarea"
                            placeholder="Type '##' for AI commands"
                            value={courseContent}
                            onChange={handleChange}
                            onInput={handleTextAreaHeight}
                            aria-label="Course content editor"
                        />
                    </div>
                </div>
            </div>

            {/* Modal for collecting user thoughts */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3 className="modal-title">What's your thought for this course?🤔</h3>
                        <textarea
                            value={modalText}
                            onChange={(e) => setModalText(e.target.value)}
                            placeholder="Type your thoughts here..."
                            onInput={handleTextAreaHeight}
                        />
                        <button className="modal-cancel" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </button>
                        <button className="modal-submit" onClick={handleModalSubmit}>
                            Submit
                        </button>
                    </div>
                </div>
            )}

            {/* Loading GIF */}
            {isLoading && (
                <div className="loading-overlay">
                    <img src={loading} alt="Loading..." />
                </div>
            )}

            {/* Display AI response in a new modal */}
            {aiResponse && (
                <div className="ai-response-modal">
                    <div className="ai-response-container" style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)" }}>
                        <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Magic Writer:</h3>
                        <p style={{ textAlign: "center", marginBottom: "20px" }}>{aiResponse}</p>

                        <div className="ai-response-buttons" style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            {/* Insert Button */}
                            <button
                                onClick={insertText}
                                style={{
                                    backgroundColor: "#4CAF50", // Green background for insert button
                                    color: "#fff",
                                    borderRadius: "5px",
                                    padding: "10px 20px",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Insert
                            </button>

                            {/* Regenerate Button */}
                            <button
                                onClick={regenerateContent}
                                style={{
                                    backgroundColor: "#2196F3", // Blue background for regenerate button
                                    color: "#fff",
                                    borderRadius: "5px",
                                    padding: "10px 20px",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Regenerate
                            </button>

                            {/* Close button */}
                            <button
                                className="ai-response-close"
                                onClick={() => setAiResponse("")}
                                style={{
                                    backgroundColor: "#ff4d4d", // Red background for close button
                                    color: "#fff", // White text color
                                    borderRadius: "50%",
                                    width: "30px",
                                    height: "30px",
                                    fontSize: "18px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="toolbar-container">
                <button className="toolbar-btn" >
                    <BiPencil />
                </button>
                <button className="toolbar-btn">
                    <BiRefresh />
                </button>
                <button className="toolbar-btn">
                    <BiMicrophone />
                </button>
                <button className="toolbar-btn">
                    <BiSend />
                </button>
            </div>
        </div>


    );
}

export default MagicWritter;
