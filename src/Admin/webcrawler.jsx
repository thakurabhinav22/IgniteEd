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
  const [selectedVideos, setSelectedVideos] = useState([]); // For selected videos
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [scrapedText, setScrapedText] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [cseLoading, setCseLoading] = useState(false);

  const server_end_point = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/scrape";
  const download_endpoint = "https://b978747b-0cfa-4ac8-aa74-e01288e8d3c1-00-2tmnjhgcuv5r3.pike.replit.dev/download-pdfs-as-text";
  const youtube_search_endpoint = "https://d7150945-fc09-42e1-800c-b55c84548d79-00-1r5xa442n98oj.sisko.replit.dev/search_videos";

  const cseRef = useRef(null);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(server_end_point, { method: "HEAD", mode: "cors" });
      console.log("Server status check response:", response.status);
      if (response.status === 405 || response.ok) setServerStatus("online");
      else setServerStatus("offline");
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
    return () => document.body.removeChild(script);
  }, []);

  useEffect(() => {
    if (isSearchPopupOpen && cseRef.current) {
      setCseLoading(true);
      setTimeout(() => setCseLoading(false), 1000);
    }
  }, [isSearchPopupOpen]);

  const handleLinksChange = (e) => setLinks(e.target.value);

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
    padding: "8px 16px",
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: "14px",
    borderRadius: "20px",
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "1000",
    backgroundColor: serverStatus === "online" ? "#34c759" : "#dc3545",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
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
      prev.includes(link) ? prev.filter((item) => item !== link) : [...prev, link]
    );
  };

  const handleScrapedCheckboxChange = (url) => {
    setSelectedScrapedLinks((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
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

  const handleSearchQuery = (e) => setSearchQuery(e.target.value);

  const handleYTVideoSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a search query.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apiKey = "AIzaSyAP4B0ZgKDayt0FHQmKKippqdlnoLoOsNA";
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

  const handleVideoCheckboxChange = (link) => {
    setSelectedVideos((prev) =>
      prev.includes(link) ? prev.filter((item) => item !== link) : [...prev, link]
    );
  };

  const handleCreateCourse = () => {
    Swal.fire({
      title: "Comming Soon!!!",
      text: "This is Feature is under development",
      icon: "info",
    })

    // if (selectedVideos.length === 0) {
    //   alert("No videos selected for course creation.");
    //   return;
    // }
    // const courseContent = selectedVideos
    //   .map((link) => {
    //     const result = searchResults.find((r) => r.link === link);
    //     return `--- Video: ${result.title} ---\nURL: ${link}\nDescription: ${result.snippet || "No description available"}`;
    //   })
    //   .join("\n\n");
    // setScrapedText(courseContent);
    // setIsSaveModalOpen(true);
  };

  return (
    <div className="crawler-main">
      <AdminSidebar />

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

      <div className="crawler-content">

        {activeTab === "link-scraper" && (
          <div className="tab-panel">
            <div className="panel-header">
              <h2 className="section-title">🔗 Link Scraper</h2>
              <p className="section-subtitle">Extract and scrape content from provided URLs.</p>
            </div>
            <div className="search-container">
              <textarea
                className="search-input large"
                placeholder="Enter text with links (e.g., https://example.com, https://example.com/file.pdf)..."
                value={links}
                onChange={handleLinksChange}
              ></textarea>
              <button className="action-btn link-scraper-btn" onClick={extractLinks}>
                <FaSearch /> Start Crawling
              </button>
            </div>
            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading content...</p>
              </div>
            )}
            {error && <p className="error-message">{error}</p>}
            {processedLinks.length > 0 && (
              <div className="results-section">
                <h3 className="sub-heading">Extracted Links:</h3>
                <ul className="link-list">
                  {processedLinks.map((link, index) => (
                    <li key={index} className="link-item">
                      <input
                        type="checkbox"
                        onChange={() => handleScrapedCheckboxChange(link)}
                        checked={selectedScrapedLinks.includes(link)}
                        className="link-checkbox"
                      />
                      <div className="link-content">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="link-text">
                          {link}
                        </a>
                        {scrapedContent.some((item) => item.url === link) && (
                          <button
                            className="toggle-button"
                            onClick={() => toggleContentVisibility(link)}
                          >
                            {scrapedContent.some((item) => item.url === link && item.visible) ? (
                              <FaAngleUp />
                            ) : (
                              <FaAngleDown />
                            )}
                          </button>
                        )}
                        {scrapedContent
                          .filter((item) => item.url === link && item.visible)
                          .map((item, idx) => (
                            <div key={idx} className="scraped-content">
                              <h4>{item.url}</h4>
                              <p>{item.content}</p>
                            </div>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
                {scrapedContent.length > 0 && (
                  <button className="action-btn secondary" onClick={handleSaveLinkScraperContent}>
                    <FaSave /> Save to Repository
                  </button>
                )}
              </div>
            )}
            {processedLinks.length === 0 && !loading && !error && links.trim() && (
              <p className="no-results">No links found in the provided text.</p>
            )}
          </div>
        )}

        {activeTab === "keyword-searcher" && (
          <div className="tab-panel">
            <div className="panel-header">
              <h2 className="section-title">🔑 Keyword Searcher</h2>
              <p className="section-subtitle">Search for content using keywords.</p>
            </div>
            <div className="search-container">
              <input
                className="search-input"
                type="text"
                placeholder="Enter keyword to search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <button className="action-btn" onClick={handleKeywordSearch}>
                <FaSearch /> Search
              </button>
            </div>
            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading...</p>
              </div>
            )}
            {error && <p className="error-message">{error}</p>}
            {keyScraped.length > 0 && (
              <div className="results-section">
                <h3 className="sub-heading">Results:</h3>
                <ul className="link-list">
                  {Object.entries(
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
                      <h4 className="domain-title">{domain}</h4>
                      {links.map((link, index) => (
                        <li key={index} className="link-item">
                          <input
                            type="checkbox"
                            onChange={() => handleCheckboxChange(link)}
                            checked={selectedLinks.includes(link)}
                            className="link-checkbox"
                          />
                          <a href={link} target="_blank" rel="noopener noreferrer" className="link-text">
                            {link}
                          </a>
                        </li>
                      ))}
                    </div>
                  ))}
                </ul>
                {selectedLinks.length > 0 && (
                  <button className="action-btn secondary" onClick={handleProcessSelected}>
                    Process Selected
                  </button>
                )}
              </div>
            )}
            {keyScraped.length === 0 && !loading && !error && keyword.trim() && (
              <p className="no-results">No results found for "{keyword}".</p>
            )}
          </div>
        )}

        {activeTab === "yt-video-courses" && (
          <div className="tab-panel yt-video-courses-panel">
            <div className="panel-header">
              <h2 className="section-title">🎥 YT Video Courses</h2>
              <p className="section-subtitle">Discover and curate YouTube video courses for your learning journey.</p>
            </div>
            <div className="search-container">
              <input
                className="search-input"
                type="text"
                placeholder="Enter topic (e.g., 'React tutorials')..."
                value={searchQuery}
                onChange={handleSearchQuery}
              />
              <button className="action-btn" onClick={handleYTVideoSearch}>
                <FaSearch /> Search URLs
              </button>
            </div>
            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading videos...</p>
              </div>
            )}
            {error && <p className="error-message">{error}</p>}
            {searchResults.length > 0 && (
              <div className="results-section">
                <ul className="video-list">
                  {searchResults.map((result, index) => (
                    <li key={index} className="video-item">
                      <input
                        type="checkbox"
                        checked={selectedVideos.includes(result.link)}
                        onChange={() => handleVideoCheckboxChange(result.link)}
                        className="video-checkbox"
                      />
                      <div className="video-content">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="video-title"
                        >
                          {result.title}
                        </a>
                        <p className="video-description">{result.snippet || "No description available"}</p>
                        <iframe
                          width="100%"
                          height="315"
                          src={result.link.replace("watch?v=", "embed/")}
                          title={result.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="video-player"
                        ></iframe>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="action-btn secondary" onClick={handleCreateCourse}>
                  Create Course from Selected ({selectedVideos.length})
                </button>
              </div>
            )}
            {searchResults.length === 0 && !loading && !error && searchQuery.trim() && (
              <p className="no-results">No results found for "{searchQuery}".</p>
            )}
          </div>
        )}
      </div>

      <div style={serverStatusStyle}>Server is {serverStatus.toUpperCase()}</div>

      {isSaveModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Save to Repository</h3>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Enter name for repository entry"
              className="modal-input"
            />
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={handleViewScrapedContent}>
                <FaEye /> View Content
              </button>
              <button className="action-btn" onClick={handleSaveToRepo}>
                Save
              </button>
              <button className="action-btn cancel" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && (
        <div className="modal-overlay">
          <div className="modal view-modal">
            <h3 className="modal-title">Scraped Content</h3>
            <pre className="scraped-text">{scrapedText}</pre>
            <div className="modal-actions">
              <button className="action-btn cancel" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}