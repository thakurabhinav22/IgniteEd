import React, { useState, useEffect, useRef } from "react";
import "./MagicWritter.css";
import AdminSidebar from "./adminSideBar";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";
import loading from "../icons/Loading.gif";

function MagicWritter() {
    const [courseContent, setCourseContent] = useState("");
    const [lineNumbers, setLineNumbers] = useState([1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalText, setModalText] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Loading state
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
            // Make an API call to Gemini or any text-generation service you are using
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

            // Initialize the Gemini model with the specific model name.
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            console.log(API_KEY);
            const result = await model.generateContent(inputText);
            // Extract the generated text or return an error message if it fails.
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

    return (
        <div className="magic-writter-container">
            <div className="admin-sidebar">
                <AdminSidebar />
            </div>
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
                    <div className="ai-response-container">
                        <button
                            className="ai-response-close"
                            onClick={() => setAiResponse("")}
                        >
                            ×
                        </button>
                        <h3>Magic Writer:</h3>
                        <p>{aiResponse}</p>

                        <div className="ai-response-buttons">
                            <button
                                onClick={() => {
                                    setCourseContent((prevContent) =>
                                        prevContent.replace("##", aiResponse)
                                    );
                                    setAiResponse(""); // Clear response after inserting
                                }}
                            >
                                Insert
                            </button>
                            <button onClick={() => {
                                generateAIResponse(modalText); // Regenerate AI response
                                setAiResponse(""); // Close the AI response modal
                                setIsModalOpen(false); // Optional: Close the thoughts modal if needed
                            }}>
                                Regenerate
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MagicWritter;
