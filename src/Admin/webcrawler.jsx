import React, { useState, useEffect } from "react";
import { FaAngleDown, FaAngleUp, FaEye } from "react-icons/fa";
import "./webcrawler.css";
import AdminSidebar from "./adminSideBar";

export default function WebCrawler() {
  const [activeTab, setActiveTab] = useState("link-scraper");
  const [links, setLinks] = useState("");
  const [processedLinks, setProcessedLinks] = useState([]);
  const [scrapedContent, setScrapedContent] = useState([]);
  const [keyScraped, setKeyScraped] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState("offline");
  const [keyword, setKeyword] = useState("");
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [scrapedText, setScrapedText] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const server_end_point = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/scrape";
  const download_endpoint = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/download-pdfs-as-text";

  // Check server status
  const checkServerStatus = async () => {
    try {
      const response = await fetch(server_end_point);
      if (response.status === 405 || response.ok) {
        setServerStatus("online");
      } else {
        setServerStatus("offline");
      }
    } catch (err) {
      console.error("Error checking server status:", err);
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "search-engine") {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://cse.google.com/cse.js?cx=13cbaf0acfe7f4937";
      script.onload = () => console.log("CSE script loaded successfully.");
      script.onerror = () => console.error("Error loading CSE script.");
      document.body.appendChild(script);
    }
  }, [activeTab]);

  const handleLinksChange = (e) => {
    setLinks(e.target.value);
  };

  const extractLinks = async () => {
    const regex = /https?:\/\/[^\s]+/g;
    const linkArray = links.match(regex);
    setProcessedLinks(linkArray || []);

    if (linkArray) {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(server_end_point, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: linkArray }),
        });
        const data = await response.json();
        setScrapedContent(data.scraped_data || []);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError("Error fetching content");
        console.error("Error scraping content:", err);
      }
    }
  };

  const serverStatusStyle = {
    padding: "10px",
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    borderRadius: "5px",
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "1000",
    backgroundColor: serverStatus === "online" ? "green" : "red",
  };

  const toggleContentVisibility = (url) => {
    setScrapedContent((prevContent) =>
      prevContent.map((item) =>
        item.url === url ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleKeywordSearch = async () => {
    if (!keyword.trim()) {
      alert("Please enter a keyword before searching.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: keyword, author: "", keywords: "" }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch search results");
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

  const handleProcessSelected = async () => {
    if (selectedLinks.length === 0) {
      alert("No files selected for processing.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(download_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_links: selectedLinks }),
      });

      if (!response.ok) {
        throw new Error("Error fetching text content.");
      }

      const data = await response.json();
      setScrapedText(data.text_content || "No content extracted.");
      setIsSaveModalOpen(true); // Open save modal
      setLoading(false);
    } catch (error) {
      console.error("Error fetching text content:", error);
      alert("Failed to fetch text content.");
      setLoading(false);
    }
  };

  const handleViewScrapedContent = () => {
    if (!scrapedText) {
      alert("No content available to view. Please process some PDFs first.");
      return;
    }
    setIsViewModalOpen(true);
  };

  const handleSaveToRepo = () => {
    if (!repoName.trim()) {
      alert("Please enter a name for the repository entry.");
      return;
    }

    // Here you would typically send the data to your backend to save to a repository
    // For this example, we'll simulate it with a console log
    console.log("Saving to repo:", {
      name: repoName,
      content: scrapedText,
    });

    // Simulate saving (replace with actual API call if needed)
    setTimeout(() => {
      alert(`Content saved to repository as "${repoName}"`);
      setIsSaveModalOpen(false);
      setRepoName("");
      setScrapedText(""); // Clear after saving
    }, 500);
  };

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
                      {scrapedContent.some((item) => item.url === link && item.visible) ? (
                        <button
                          className="toggle-button"
                          onClick={() => toggleContentVisibility(link)}
                        >
                          <FaAngleUp />
                        </button>
                      ) : (
                        <button
                          className="toggle-button"
                          onClick={() => toggleContentVisibility(link)}
                        >
                          <FaAngleDown />
                        </button>
                      )}
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

        {/* Keyword Searcher Tab */}
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
                      const domain = url.hostname;
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
                  <button className="process-btn" onClick={handleProcessSelected}>
                    Process Selected
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Engine Tab */}
        {activeTab === "search-engine" && (
          <div className="tab-panel">
            <h2>🌍 Search Engine</h2>
            <p>Perform intelligent searches across the web.</p>
            <div className="google-search">
              <div className="gcse-search"></div>
            </div>
          </div>
        )}
      </div>

      {/* Server Status */}
      <div style={serverStatusStyle}>Server is {serverStatus.toUpperCase()}</div>

      {/* Save to Repo Modal */}
      {isSaveModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Save to Repository</h3>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Enter name for repository entry"
              className="modal-input"
            />
            <div className="modal-actions">
              <button className="modal-btn view-btn" onClick={handleViewScrapedContent}>
                <FaEye /> View Content
              </button>
              <button className="modal-btn save-btn" onClick={handleSaveToRepo}>
                Save
              </button>
              <button className="modal-btn cancel-btn" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Scraped Content Modal */}
      {isViewModalOpen && (
        <div className="modal-overlay">
          <div className="modal view-modal">
            <h3>Scraped Content</h3>
            <pre className="scraped-text">{scrapedText}</pre>
            <div className="modal-actions">
              <button className="modal-btn close-btn" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}