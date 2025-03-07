import React from 'react';
import './HomePage.css';
import { FaBrain, FaTools, FaBook, FaRocket, FaChartLine, FaUsers } from 'react-icons/fa';
import { Link } from 'react-scroll';

export default function HomePage() {
  return (
    <div className="homepage">
      {/* Navigation Bar */}
      <nav className="home-nav">
        <h2 className="nav-logo">LearnMax</h2>
        <ul className="nav-links">
          <li>
            <Link to="hero-section" smooth={true} duration={500} className="nav-link-item">
              Home
            </Link>
          </li>
          <li>
            <Link to="about-section" smooth={true} duration={500} className="nav-link-item">
              About
            </Link>
          </li>
          <li>
            <Link to="resource-management" smooth={true} duration={500} className="nav-link-item">
              Admin
            </Link>
          </li>
          <li>
            <Link to="skill-learning" smooth={true} duration={500} className="nav-link-item">
              Student
            </Link>
          </li>
          <li>
            <Link to="contact-section" smooth={true} duration={500} className="nav-link-item">
              Contact Us
            </Link>
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="section hero-section" id="hero-section">
        <div className="hero-content">
          <h1>
            LearnMax: <span className="highlight">AI-Powered Education</span>
          </h1>
          <p>
            Elevate learning and management with AI-driven precision. Master skills and optimize resources seamlessly.
          </p>
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
            alt="AI Education"
            className="hero-image"
          />
        </div>
      </section>

      {/* About Section */}
      <section className="section about-section" id="about-section">
        <h1>About LearnMax</h1>
        <p>
          LearnMax is an innovative platform leveraging artificial intelligence to transform education. We empower students with personalized skill-based learning and provide administrators with tools to manage resources efficiently.
        </p>
      </section>

      {/* Features Section */}
      <section className="section features-section">
        <h1>Why LearnMax?</h1>
        <div className="features">
          <div className="feature-card" id="resource-management">
            <FaTools className="feature-icon" />
            <h3>Resource Management</h3>
            <p>
              Streamline schedules, allocations, and insights with AI for unmatched efficiency.
            </p>
          </div>
          <div className="feature-card" id="skill-learning">
            <FaBook className="feature-icon" />
            <h3>Skill-Based Learning</h3>
            <p>
              Gain practical skills with AI-tailored modules designed for real-world success.
            </p>
          </div>
          <div className="feature-card">
            <FaBrain className="feature-icon" />
            <h3>AI Insights</h3>
            <p>
              Personalized learning and management powered by intelligent AI analytics.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section how-it-works">
        <h1>How It Works</h1>
        <div className="steps">
          <div className="step-card">
            <FaRocket className="step-icon" />
            <h3>Sign Up</h3>
            <p>Start as an Admin or Student with a simple click.</p>
          </div>
          <div className="step-card">
            <FaChartLine className="step-icon" />
            <h3>Personalize</h3>
            <p>AI customizes your learning or management experience.</p>
          </div>
          <div className="step-card">
            <FaUsers className="step-icon" />
            <h3>Thrive</h3>
            <p>Excel with smart tools and resources.</p>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
          alt="Education Process"
          className="section-image"
        />
      </section>

      {/* Education Section */}
      <section className="section education">
        <h1>Explore LearnMax</h1>
        <p>
          An AI-driven ecosystem built to empower students and administrators with cutting-edge tools.
        </p>
        <ul className="education-list">
          <li><FaBrain /> Personalized Learning Paths</li>
          <li><FaTools /> Resource Optimization</li>
          <li><FaBook /> Skill Development</li>
          <li><FaChartLine /> Real-Time Analytics</li>
          <li><FaUsers /> Collaboration Tools</li>
          <li><FaRocket /> Scalable Solutions</li>
        </ul>
        <img
          src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
          alt="Learning Ecosystem"
          className="section-image"
        />
      </section>

      {/* Contact Us Section */}
      <section className="section contact-section" id="contact-section">
        <h1>Contact Us</h1>
        <p>
          Have questions? Reach out to us at <a href="mailto:support@learnmax.com">support@learnmax.com</a> or call us at (123) 456-7890. We’re here to help!
        </p>
      </section>

      {/* Call to Action Section */}
      <section className="section cta-section">
        <h1>Join LearnMax Today</h1>
        <p>
          Transform education with AI—sign up as an Admin or Student and start your journey now!
        </p>
        <img
          src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
          alt="Community"
          className="cta-image"
        />
      </section>
    </div>
  );
}