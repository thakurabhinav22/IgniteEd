import "./magicEditor.css";
import React, { useState, useEffect } from "react";
import AdminSidebar from "./adminSideBar";
import { useLocation, useNavigate } from "react-router-dom";

const MagicEditor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileName, content } = location.state || {};

  const [editedContent, setEditedContent] = useState(content || "");

  useEffect(() => {
    if (!content || content.trim() === "") {
      navigate("/admin/dashboard"); // Redirect if no content
    }
  }, [content, navigate]);

  const handleSave = () => {
    // Navigate to the publish course page with edited data
    navigate("/Admin/CreateCourse/publishcourse", {
      state: { fileName, editedContent },
    });
  };

  const handleCancel = () => {
    // Navigate back to CreateCourse and remove the course data
    navigate("/Admin/CreateCourse", { state: { removeCourse: true } });
  };

  return (
    <>
      <AdminSidebar />
      <div className="magic-editor-wrapper">
        <div className="editor-header">
          <h1 className="editor-title">Editing: {fileName || "Untitled File"}</h1>
        </div>
        <textarea
          className="editor-textarea"
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          placeholder="Start typing here..."
          rows={20}
        ></textarea>
        <div className="editor-actions">
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};

export default MagicEditor;
