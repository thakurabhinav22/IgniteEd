import React, { useState, useEffect, useRef } from "react";
import "./MagicWritter.css";
import AdminSidebar from "./adminSideBar";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Swal from "sweetalert2";
import loading from "../icons/Loading.gif";
import { BiPencil, BiRefresh, BiMicrophone, BiSend } from "react-icons/bi";
import { FaCompressArrowsAlt, FaExpandArrowsAlt, FaSave, FaUpload, FaPencilAlt } from 'react-icons/fa';
import { getDatabase, ref, set, push, get } from "firebase/database";
import Cookies from "js-cookie";

function MagicWritter() {
    const [courseContent, setCourseContent] = useState("");
    const [lineNumbers, setLineNumbers] = useState([1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalText, setModalText] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTitleModalOpen, setTitleModalOpen] = useState(false);  // Renamed state variable
    const [projectTitle, setProjectTitle] = useState('');  // Renamed state variable
    const [selectedText, setSelectedText] = useState("");
    const [isAiGenerated, setIsAiGenerated] = useState(false); // Track if AI content was generated
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);
    const [drafts, setDrafts] = useState([]);
    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false); // State for draft selection modal
    const [selectedDrafts, setSelectedDrafts] = useState([]);

    // Fetcg Draft
    const handleCloseDraftModal = () => {
        setIsDraftModalOpen(false);
        setSelectedDrafts([]); // Clear selected drafts
    };

    const handleOpenDraftModal = () => {
        fetchDrafts(); // Fetch drafts from Firebase
        setIsDraftModalOpen(true);
    };

    const handleDraftSelection = (draftId) => {
        if (selectedDrafts.includes(draftId)) {
            setSelectedDrafts(selectedDrafts.filter(id => id !== draftId)); // Deselect
        } else {
            setSelectedDrafts([...selectedDrafts, draftId]); // Select
        }
    };

    // Handle loading the selected draft for editing
    const handleLoadSelectedDraft = () => {
        if (selectedDrafts.length === 0) {
            Swal.fire({
                title: "No Draft Selected",
                text: "Please select at least one draft to edit.",
                icon: "warning",
            });
            return;
        }

        const selectedDraft = drafts.find(draft => draft.id === selectedDrafts[0]); // Load the first selected draft
        if (selectedDraft) {
            setCourseContent(selectedDraft.content);
            setProjectTitle(selectedDraft.title);
            setIsDraftModalOpen(false); // Close the modal
        }
    };

    // Fetch drafts from Firebase
    const fetchDrafts = async () => {
        const uid = Cookies.get("userSessionCredAd");
        if (!uid) {
            alert("User not logged in!");
            return;
        }

        const db = getDatabase();
        const draftRef = ref(db, `admin/${uid}/Database/`);

        try {
            const snapshot = await get(draftRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                const draftList = Object.keys(data).map(key => ({
                    id: key,
                    title: data[key].title,
                    content: data[key].content,
                }));
                setDrafts(draftList);
            } else {
                alert("No drafts found!");
            }
        } catch (error) {
            console.error("Error fetching drafts:", error);
        }
    };



    // Handle Save To Repo button click
    const handleSaveClick = () => {
        setTitleModalOpen(true); // Open the modal
    };


    const handleSaveProject = async () => {
        if (projectTitle) {
            const uid = Cookies.get("userSessionCredAd");  // Get user UID from cookies

            if (!uid) {
                alert('User not logged in!');
                return;
            }

            try {
                // Get Firebase Database instance
                const db = getDatabase();

                // Reference to the project's path in Firebase
                const projectRef = ref(db, `admin/${uid}/Database/`);

                // Push a new entry and get the unique key
                const newProjectRef = push(projectRef);

                // Store project data in Firebase
                await set(newProjectRef, {
                    title: projectTitle,
                    content: courseContent,
                });


                setTitleModalOpen(false); // Close modal after saving
            } catch (error) {
                console.error("Error saving project:", error);
                alert('There was an error saving the project.');
            }
        } else {
            alert('Please enter a project title.');
        }
    };



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

        // Reset the AI generation state if ## is typed again, so the modal can open
        if (newContent.includes("##") && !isModalOpen) {
            if (isAiGenerated) {
                setIsAiGenerated(false); // Reset AI generated state
            }
            setIsModalOpen(true); // Show the modal
        }
    };


    const handleTextSelection = () => {
        const selected = window.getSelection().toString();
        setSelectedText(selected); // Store the selected text in state
    };

    const handleModalSubmit = () => {
        generateAIResponse(modalText, selectedText);
        setIsModalOpen(false); // Close the modal after submitting
        setIsAiGenerated(true); // Set AI content as generated
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

    const insertText = () => {
        setCourseContent(prevContent => prevContent.replace(selectedText, aiResponse));
        setAiResponse(""); // Clear the AI response after inserting
        setIsAiGenerated(true); // Mark AI content as inserted
    };

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
                <button className="toolbar-btn" onClick={handleEditButtonClick} title="Modify the Selected Content">
                    <BiPencil />
                </button>

                <button className="toolbar-btn" title="Regenerate the Selected Content">
                    <BiRefresh />
                </button>

                <button className="toolbar-btn" title="Summarize the selected content">
                    <FaCompressArrowsAlt />
                </button>

                <button className="toolbar-btn" title="Expand the select content">
                    <FaExpandArrowsAlt />
                </button>
            </div>

            {/* Draft and Publish Action Buttons */}

            <div className="action-buttons-container">
                <button onClick={handleOpenDraftModal} className="edit-draft">
                    < FaPencilAlt /> Edit Draft
                </button>
                <button onClick={handleSaveClick} className="save-draft">
                    <FaSave /> Save To Repo
                </button>
                <button className="publish">
                    <FaUpload /> Publish
                </button>
            </div>

            {isTitleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Enter Project Title</h3>
                        <input
                            type="text"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="Enter title"
                        />
                        <button className="modal-cancel" onClick={() => setTitleModalOpen(false)}>Cancel</button>
                        <button className="modal-save" onClick={handleSaveProject}>Save</button>
                    </div>
                </div>
            )}
            {isDraftModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3 className="modal-title">Select Draft to Edit</h3>
                        <ul className="draft-list">
                            {drafts.map((draft) => (
                                <li key={draft.id} className="draft-item">
                                    <label className="draft-label">
                                        <input
                                            type="checkbox"
                                            checked={selectedDrafts.includes(draft.id)}
                                            onChange={() => handleDraftSelection(draft.id)}
                                            className="draft-checkbox"
                                        />
                                        {draft.title}
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <div className="modal-actions">
                            <button className="modal-btn secondary close-draft" onClick={handleCloseDraftModal}>
                                Cancel
                            </button>
                            <button className="modal-btn primary load-draft" onClick={handleLoadSelectedDraft}>
                                Load Selected Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}

export default MagicWritter;