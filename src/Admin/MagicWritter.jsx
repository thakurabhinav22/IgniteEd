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
    const [selectedText, setSelectedText] = useState("");
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

    useEffect(() => {
        // Focus the textarea when the modal opens
        if (isModalOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isModalOpen]);

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
        if (textarea) {
            textarea.addEventListener("scroll", handleScroll);
        }

        return () => {
            if (textarea) {
                textarea.removeEventListener("scroll", handleScroll);
            }
        };
    }, [courseContent]);

    const handleChange = (e) => {
        const newContent = e.target.value;
        setCourseContent(newContent);

        // Detect if '##' is typed and show the modal
        if (newContent.includes("##") && !isModalOpen) {
            setIsModalOpen(true);
        }
    };

    const handleTextSelection = () => {
        const selected = window.getSelection().toString();
        setSelectedText(selected); // Store the selected text in state
        
        if (selected.trim()) {
            setIsModalOpen(true);  // Open the modal if text is selected
        }
    };
    

    const handleModalSubmit = () => {
        // Call AI to generate response based on modal text
        generateAIResponse(modalText, selectedText);
        setIsModalOpen(false); // Close the modal after submitting
        // Refocus the textarea after closing the modal
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };
    const handleEditButtonClick = () => {
        // Trigger modal with the selected text when "Edit" is clicked
        if (selectedText.trim()) {
            setModalText(''); // Clear any previous comment in the modal
            setIsModalOpen(true); // Open the modal to enter user comment
        } else {
            Swal.fire({
                title: "No text selected",
                text: "Please select some text first.",
                icon: "warning",
                confirmButtonText: "OK",
            });
        }
    };
    


    const generateAIResponse = async (text, selectedText) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setIsLoading(true); // Show loading GIF

        try {
            const generatedContent = await handleGemini(text, selectedText);
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


    const handleGemini = async (inputText, selectedText) => {
        let prompt = '';

        // Alert selected text to ensure it's being passed
        // alert(selectedText);

        // Case where no text is selected
        if (selectedText.trim() === '') {
            prompt = `You are a highly trained AI model, designed specifically to assist users in building course content. Your task is to provide the user with the most relevant and concise information based on the provided input. Avoid any responses like "Here is your answer" or "Let me explain". Instead, directly provide the requested content. User Query: ${inputText}`;
        } else {
            prompt = `You are a professional AI model, specifically trained to help users build course content. Your task is to provide relevant information based on the user's input and replace the selected text accordingly. Do not include any introductory phrases like "Here is your answer". Just provide the modified content. Provided Text: ${selectedText} User's Request: ${inputText} Replace the selected text with content that aligns with the user's request while maintaining the same topic and tone.`;
        }

        try {
            const API_KEY = process.env.REACT_APP_GEMINI;
            const genAI = new GoogleGenerativeAI(API_KEY);

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let generatedText = await response.text();
            return generatedText;
            selectedText = ''
            inputText = ''

        } catch (error) {
            console.error("Error generating text:", error);
            return "An error occurred while generating the content.";
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
        setCourseContent(prevContent => prevContent.replace(selectedText, aiResponse));
        setAiResponse(""); // Clear the AI response after inserting
    };

    // Regenerate the AI response with the current modal text
    const regenerateContent = () => {
        setAiResponse(""); // Clear the current AI response
        setIsModalOpen(false); // Close the modal
        generateAIResponse(modalText, selectedText); // Regenerate AI content based on the new modal text
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
                            onMouseUp={handleTextSelection}
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
                            ref={textareaRef}  // Attach the ref to the textarea
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
                <button className="toolbar-btn" onClick={handleEditButtonClick}>
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
