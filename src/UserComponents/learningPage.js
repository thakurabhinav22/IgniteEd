import React from "react";
import Sidebar from "./Sidebar";
import "./learningPage.css";

function LearningPage() {
  return (
    <div className="learning-page-container">
      <Sidebar />
      <div className="learning-content">
        {/* Add your learning page content here */}
        <h1>Learning Page</h1>
        <p>This is the content of the learning page.</p>
      </div>
    </div>
  );
}

export default LearningPage;
