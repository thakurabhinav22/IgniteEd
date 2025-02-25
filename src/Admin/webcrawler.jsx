import React, { useState, useEffect } from "react";
import { FaAngleDown, FaAngleUp } from "react-icons/fa"; // Import icons
import "./webcrawler.css";
import AdminSidebar from "./adminSideBar";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function WebCrawler() {
  const [activeTab, setActiveTab] = useState("link-scraper");
  const [links, setLinks] = useState("");
  const [processedLinks, setProcessedLinks] = useState([]);
  const [scrapedContent, setScrapedContent] = useState([]);
  const [keyScraped, setKeyScraped] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState("offline"); // Track server status
  const [keyword, setKeyword] = useState(""); // State for keyword search
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const server_end_point = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/scrape"

  // Function to check server status
  const checkServerStatus = async () => {
    try {
      const response = await fetch(server_end_point);

      // If response status is 405, treat it as "online" because the server is responding
      if (response.status === 405) {
        setServerStatus("online");
      } else if (response.ok) {
        setServerStatus("online");
      } else {
        setServerStatus("offline");
      }
    } catch (err) {
      console.error("Error checking server status:", err);
      setServerStatus("offline");
    }
  };

  // Use effect to check server status when the component mounts
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Check every 30 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  useEffect(() => {
    if (activeTab === "search-engine") {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://cse.google.com/cse.js?cx=13cbaf0acfe7f4937";
      script.onload = () => {
        console.log("CSE script loaded successfully.");
      };
      script.onerror = () => {
        console.error("Error loading CSE script. Please check the URL.");
      };
      document.body.appendChild(script);
    }
  }, [activeTab]);


  // Handle change in input links
  const handleLinksChange = (e) => {
    setLinks(e.target.value);
  };

  // Function to extract links from the input text
  const extractLinks = async () => {
    const regex = /https?:\/\/[^\s]+/g;
    const linkArray = links.match(regex); // Find all URLs
    setProcessedLinks(linkArray || []);

    if (linkArray) {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(server_end_point, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ urls: linkArray }),
        });
        const data = await response.json();
        setScrapedContent(data.scraped_data || []); // Ensure default to empty array if undefined
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError("Error fetching content");
        console.error("Error scraping content:", err);
      }
    }
  };

  // Server status styles
  const serverStatusStyle = {
    padding: "10px",
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    borderRadius: "5px",
    position: "fixed", // Fix the position
    top: "20px", // Adjust for spacing from the top
    right: "20px", // Position at the top-right corner
    zIndex: "1000", // Ensure it's above other elements
  };

  const serverStatusColor = serverStatus === "online" ? "green" : "red";

  // Function to toggle content visibility for each link
  const toggleContentVisibility = (url) => {
    setScrapedContent((prevContent) =>
      prevContent.map((item) =>
        item.url === url ? { ...item, visible: !item.visible } : item
      )
    );
  };

  // Keyword search handler
  const handleKeywordSearch = async () => {
    if (!keyword.trim()) {
      alert("Please enter a keyword before searching.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: keyword, author: "", keywords: "" }),
        }
      );

      if (!response.ok) throw new Error(`Failed to fetch search results`);

      const data = await response.json();
      setKeyScraped(data.pdf_links || []);
    } catch (err) {
      setError("Error fetching search results.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (link) => {
    setSelectedLinks((prev) =>
      prev.includes(link)
        ? prev.filter((item) => item !== link)
        : [...prev, link]
    );
  };

  const handleDownloadSelected = async () => {
    if (selectedLinks.length === 0) {
        alert("No files selected for download.");
        return;
    }

    try {
        const response = await fetch("https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/download-pdfs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdf_links: selectedLinks }),
        });

        if (!response.ok) {
            throw new Error("Error generating ZIP file.");
        }

        // Convert response into a downloadable ZIP file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Create a download link and trigger the download
        const a = document.createElement("a");
        a.href = url;
        a.download = "downloaded_pdfs.zip";
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error("Error downloading ZIP file:", error);
        alert("Failed to download ZIP file.");
    }
};

  
  





  // Search engine handler
  const handleSearchQuery = (e) => {
    setSearchQuery(e.target.value);
  };


  return (
    <div className="crawler-main">
      <AdminSidebar />

      {/* Tab Menu */}
      <div className="crawler-tabs">
        <button
          className={activeTab === "link-scraper" ? "tab-active" : "tab-btn"}
          onClick={() => setActiveTab("link-scraper")}
        >
          Link Scraper
        </button>
        <button
          className={activeTab === "keyword-searcher" ? "tab-active" : "tab-btn"}
          onClick={() => setActiveTab("keyword-searcher")}
        >
          Keyword Searcher
        </button>
        <button
          className={activeTab === "search-engine" ? "tab-active" : "tab-btn"}
          onClick={() => setActiveTab("search-engine")}
        >
          Search Engine
        </button>
      </div>

      {/* Tab Content */}
      <div className="crawler-content">
        {/* Link Scraper Tab */}
        {activeTab === "link-scraper" && (
          <div className="tab-panel">
            <h2>🔗 Link Scraper</h2>
            <p>Enter the text with URLs to extract and display them.</p>

            <textarea
              className="link-input"
              placeholder="Enter text with links..."
              value={links}
              onChange={handleLinksChange}
            ></textarea>

            <button className="extract-btn" onClick={extractLinks}>
              Start Crawling
            </button>

            {loading && <p>Loading content...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {processedLinks.length > 0 && (
              <div className="extracted-links">
                <h3>Extracted Links:</h3>
                <ul>
                  {processedLinks.map((link, index) => (
                    <li key={index}>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {link}
                      </a>

                      {/* Show/Hide toggle button next to the link */}
                      {scrapedContent.some((item) => item.url === link && item.visible) ? (
                        <button
                          className="toggle-button"
                          onClick={() => toggleContentVisibility(link)}>
                          <FaAngleUp />
                        </button>
                      ) : (
                        <button
                          className="toggle-button"
                          onClick={() => toggleContentVisibility(link)}>
                          <FaAngleDown />
                        </button>
                      )}

                      {/* Show content if visible */}
                      {scrapedContent
                        .filter((item) => item.url === link && item.visible)
                        .map((item, index) => (
                          <div key={index} className="scraped-item">
                            <h4>{item.url}</h4>
                            <p>{item.content}</p>
                          </div>
                        ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

{activeTab === "keyword-searcher" && (
  <div className="tab-panel">
    <h2>🔑 Keyword Searcher</h2>
    <input
      className="keyword-input"
      type="text"
      placeholder="Enter keyword to search"
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
    <button className="search-btn" onClick={handleKeywordSearch}>
      Search
    </button>

    <div className="search-results">
      <h3>Results:</h3>
      {keyScraped.length > 0 ? (
        Object.entries(
          keyScraped.reduce((acc, link) => {
            try {
              const url = new URL(link);
              const domain = url.hostname; // Extract domain
              if (!acc[domain]) acc[domain] = [];
              acc[domain].push(link);
            } catch (error) {
              console.error("Invalid URL:", link);
            }
            return acc;
          }, {})
        ).map(([domain, links]) => (
          <div key={domain} className="domain-group">
            <h4>{domain}</h4>
            {links.map((link, index) => (
              <div key={index} className="scraped-item">
                <input
                  type="checkbox"
                  onChange={() => handleCheckboxChange(link)}
                  checked={selectedLinks.includes(link)}
                />
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {link}
                </a>
              </div>
            ))}
          </div>
        ))
      ) : (
        <p>No results found for "{keyword}".</p>
      )}

      {selectedLinks.length > 0 && (
        <div className="download_button_container">
        <button  className="download_select_pdf" onClick={handleDownloadSelected}>Download Selected</button></div>
      )}
    </div>
  </div>
)}




        {/* Search Engine Tab */}
        {activeTab === "search-engine" && (
          <div className="tab-panel">
            <h2>🌍 Search Engine</h2>
            <p>Perform intelligent searches across the web.</p>

            {/* Google Custom Search Engine (CSE) */}
            <div className="google-search">
              <div className="gcse-search"></div>
            </div>
          </div>
        )}
      </div>

      {/* Server Status */}
      <div
        style={{ ...serverStatusStyle, backgroundColor: serverStatusColor }}
      >
        Server is {serverStatus.toUpperCase()}
      </div>
    </div>
  );
}
