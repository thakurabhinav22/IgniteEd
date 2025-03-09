import React, { useState, useEffect, useRef } from "react";
import { FaAngleDown, FaAngleUp, FaEye, FaSave, FaSearch } from "react-icons/fa";
import "./webcrawler.css";
import AdminSidebar from "./adminSideBar";
import { getDatabase, ref, push, set } from "firebase/database";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

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
  const [selectedLinks, setSelectedLinks] = useState([]); // For Keyword Searcher
  const [selectedScrapedLinks, setSelectedScrapedLinks] = useState([]); // For Link Scraper
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]); // For YT Video Courses
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [scrapedText, setScrapedText] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false); // For search popup
  const [cseLoading, setCseLoading] = useState(false); // New state for CSE loading

  const server_end_point = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/scrape";
  const download_endpoint = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/download-pdfs-as-text";
  const youtube_search_endpoint = "https://d7150945-fc09-42e1-800c-b55c84548d79-00-1r5xa442n98oj.sisko.replit.dev/search_videos"; // Added for new function

  const cseRef = useRef(null); // Ref to the CSE container div

  const checkServerStatus = async () => {
    try {
      const response = await fetch(server_end_point, { method: "HEAD", mode: "cors" });
      console.log("Server status check response:", response.status);
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

  // Load Google CSE script
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://cse.google.com/cse.js?cx=13cbaf0acfe7f4937";
    script.onload = () => {
      console.log("CSE script loaded successfully.");
      setCseLoading(false);
    };
    script.onerror = () => {
      console.error("Error loading CSE script.");
      setCseLoading(false);
      setError("Failed to load Google Custom Search Engine.");
    };
    document.body.appendChild(script);

    // Cleanup script on unmount
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Ensure CSE is rendered when popup opens
  useEffect(() => {
    if (isSearchPopupOpen && cseRef.current) {
      setCseLoading(true);
      setTimeout(() => setCseLoading(false), 1000); // Fallback to stop loading after 1s
    }
  }, [isSearchPopupOpen]);

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
          mode: "cors",
        });
        console.log("Scrape request to:", server_end_point, "Status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to scrape content");
        }

        const data = await response.json();
        setScrapedContent(data.scraped_data.map(item => ({ ...item, visible: false })) || []);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(err.message || "Error fetching content");
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
      const response = await fetch("https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: keyword, author: "", keywords: "" }),
        mode: "cors",
      });
      console.log("Search request to:", "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/search", "Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch search results");
      }

      const data = await response.json();
      setKeyScraped(data.pdf_links || []);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Error fetching search results");
      setLoading(false);
      console.error("Error fetching search results:", err);
    }
  };

  const handleCheckboxChange = (link) => {
    setSelectedLinks((prev) =>
      prev.includes(link)
        ? prev.filter((item) => item !== link)
        : [...prev, link]
    );
  };

  const handleScrapedCheckboxChange = (url) => {
    setSelectedScrapedLinks((prev) =>
      prev.includes(url)
        ? prev.filter((item) => item !== url)
        : [...prev, url]
    );
  };

  const handleProcessSelected = async () => {
    if (selectedLinks.length === 0) {
      alert("No files selected for processing.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Requesting:", download_endpoint, "Payload:", JSON.stringify({ pdf_links: selectedLinks }));

      const response = await fetch(download_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_links: selectedLinks }),
        mode: "cors",
      });
      console.log("Download request to:", download_endpoint, "Status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch text content (Status: ${response.status})`);
      }

      const data = await response.json();
      setScrapedText(data.text_content || "No content extracted.");
      setIsSaveModalOpen(true);
      setLoading(false);
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        setError(`Network error: Could not connect to the server at ${download_endpoint}. Please ensure the server is running on Replit or try the local fallback (http://localhost:5000).`);
      } else {
        setError(error.message || "Failed to fetch text content.");
      }
      console.error("Error fetching text content:", error);
      setLoading(false);
    }
  };

  const handleSaveLinkScraperContent = () => {
    if (selectedScrapedLinks.length === 0) {
      alert("No links selected to save. Please select at least one scraped link.");
      return;
    }

    const combinedContent = scrapedContent
      .filter(item => selectedScrapedLinks.includes(item.url))
      .map(item => `--- Content from ${item.url} ---\n\n${item.content}`)
      .join("\n\n");

    setScrapedText(combinedContent);
    setIsSaveModalOpen(true);
  };

  const handleViewScrapedContent = () => {
    if (!scrapedText) {
      alert("No content available to view. Please process or scrape some content first.");
      return;
    }
    setIsViewModalOpen(true);
  };

  const handleSaveToRepo = async () => {
    if (!repoName.trim()) {
      alert("Please enter a name for the repository entry.");
      return;
    }

    const uid = Cookies.get("userSessionCredAd");
    if (!uid) {
      Swal.fire({
        title: "Error",
        text: "User not logged in!",
        icon: "error",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }

    try {
      const db = getDatabase();
      const repoRef = ref(db, `admin/${uid}/Database/`);
      const newRepoRef = push(repoRef);

      await set(newRepoRef, {
        title: repoName,
        content: scrapedText,
      });

      Swal.fire({
        title: "Saved Successfully!",
        text: `Content saved to repository as "${repoName}"`,
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });

      setIsSaveModalOpen(false);
      setRepoName("");
      setScrapedText("");
      setSelectedScrapedLinks([]);
    } catch (error) {
      console.error("Error saving to repository:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to save content to repository.",
        icon: "error",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  const handleSearchQuery = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleYTVideoSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search query.");
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      const apiKey = "AIzaSyAP4B0ZgKDayt0FHQmKKippqdlnoLoOsNA"; // Your API key
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery
        )}&type=video&maxResults=5&key=${apiKey}`
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || "Failed to fetch YouTube video results");
      }
  
      const data = await response.json();
      const formattedResults = (data.items || []).map(item => ({
        link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        snippet: item.snippet.description
      }));
      setSearchResults(formattedResults);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Error fetching YouTube video results");
      setLoading(false);
      console.error("Error fetching YouTube video results:", err);
    }
  };
  // New function to fetch and show only YouTube video URLs
  const handleYTVideoUrlSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search query.");
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching YouTube URLs for query:", searchQuery);
      const response = await fetch(
        `${youtube_search_endpoint}?query=${encodeURIComponent(searchQuery)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
        }
      );
  
      console.log("Response status:", response.status);
  
      if (!response.ok) {
        const errorData = await response.json();
        console.log("Error data:", errorData);
        if (response.status === 404) {
          throw new Error("No videos found. Try a different search term or check server status.");
        }
        throw new Error(errorData.error || "Failed to fetch YouTube video URLs");
      }
  
      const data = await response.json();
      console.log("Received data:", data);
      const formattedResults = (data.results || []).map(url => ({
        link: url,
        title: "YouTube Video",
        snippet: ""
      }));
      setSearchResults(formattedResults);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Error fetching YouTube video URLs");
      setLoading(false);
      console.error("Error fetching YouTube video URLs:", err);
    }
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
          className={activeTab === "yt-video-courses" ? "tab-active" : "tab-btn"}
          onClick={() => setActiveTab("yt-video-courses")}
        >
          YT Video Courses
        </button>
      </div>

      {/* Tab Content */}
      <div className="crawler-content">
        {/* Link Scraper Tab */}
        {activeTab === "link-scraper" && (
          <div className="tab-panel">
            <h2>🔗 Link Scraper</h2>
            <p>Enter the text with URLs to extract and scrape their content.</p>
            <textarea
              className="link-input"
              placeholder="Enter text with links (e.g., https://example.com, https://example.com/file.pdf)..."
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
                      <input
                        type="checkbox"
                        onChange={() => handleScrapedCheckboxChange(link)}
                        checked={selectedScrapedLinks.includes(link)}
                      />
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
                {scrapedContent.length > 0 && (
                  <button className="save-btn" onClick={handleSaveLinkScraperContent}>
                    <FaSave /> Save to Repository
                  </button>
                )}
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

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

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

        {/* YT Video Courses Tab */}
        {activeTab === "yt-video-courses" && (
          <div className="tab-panel">
            <h2>🎥 YT Video Courses</h2>
            <p>Search for YouTube video courses related to your topic.</p>
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Enter topic (e.g., 'React tutorials')..."
                value={searchQuery}
                onChange={handleSearchQuery}
              />
              {/* <button className="search-btn" onClick={handleYTVideoSearch}>
                <FaSearch /> Search
              </button> */}
              {/* Added new button for URL-only search */}
              <button className="search-btn" onClick={handleYTVideoSearch}>
                <FaSearch /> Search URLs
              </button>
            </div>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {searchResults.length > 0 && (
              <ul className="search-results-list">
                {searchResults.map((result, index) => (
                  <li key={index}>
                    <a href={result.link} target="_blank" rel="noopener noreferrer">
                      {result.title}
                    </a>
                    <p>{result.snippet}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Floating Search Button (Global) */}
      {/* <button
        className="floating-search-btn"
        onClick={() => setIsSearchPopupOpen(true)}
      >
        <FaSearch /> Search
      </button> */}

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

      {/* Search Popup Modal with Google CSE */}
      {/* {isSearchPopupOpen && (
        <div className="modal-overlay search-popup-overlay">
          <div className="modal search-popup">
            <h3>Search</h3>
            {cseLoading ? (
              <p>Loading Google Search... Please wait.</p>
            ) : error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : (
              <div
                className="google-search"
                ref={cseRef}
                dangerouslySetInnerHTML={{
                  __html: '<gcse:searchbox-only resultsUrl="/searchresults"></gcse:searchbox-only>',
                }}
              />
            )}
            <div className="modal-actions">
              <button
                className Anglerock className="modal-btn close-btn"
                onClick={() => {
                  setIsSearchPopupOpen(false);
                  setSearchQuery("");
                  setError(null); // Clear error on close
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}