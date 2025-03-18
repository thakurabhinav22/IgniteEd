import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import { FaBrain, FaTools, FaBook, FaRocket, FaChartLine, FaUsers } from 'react-icons/fa';
import { Link as ScrollLink } from 'react-scroll';
import studentImage from '../icons/student.png';
import instructorImage from '../icons/admin.png';
import learnmax from '../icons/learn.png';

export default function HomePage() {
  return (
    <div className="homepage">
      {/* Navigation Bar */}
      <nav className="home-nav">
      <img src={learnmax} alt="LearnMax Logo" className="learnmax" />
        <h2 className="nav-logo">IgnitEd</h2>
        <ul className="nav-links">
          <li>
            <a href="#hero" smooth={true} duration={500} className="nav-link-item ">
              Home
            </a>
          </li>
          <li>
          <a href="#about" smooth={true} duration={500} className="nav-link-item ">
            About
          </a>

          </li>
          <li>
            <a href="#contact" smooth={true} duration={500} className="nav-link-item ">
              Contact Us
            </a>
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <section className="section hero-section" id="hero">
        <div className="hero-content">
          <h1 className="fade-up slide-in">
          IgnitEd: <span className="highlight">AI-Powered Education</span>
          </h1>
          <p className="fade-up slide-in">
            Elevate learning and management with AI-driven precision. Master skills and optimize resources seamlessly.
          </p>
          <div className="card-container fade-up">
            {/* Instructor Card - First */}
            <Link to="/Admin" className="card instructor-card glow-on-hover">
              <div className="card-image">
                <img src={instructorImage} alt="Instructor" />
              </div>
              <h2>Instructor</h2>
              <p>Manage resources and courses with AI insights.</p>
            </Link>
            {/* Student Card - Second */}
            <Link to="/login" className="card student-card glow-on-hover">
              <div className="card-image">
                <img src={studentImage} alt="Student" />
              </div>
              <h2>Student</h2>
              <p>Learn at your pace with adaptive tools.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section about-section" id="about">
        <h1 className="fade-up slide-in">About IgnitEd</h1>
        <p className="fade-up slide-in">
        IgnitEd is an innovative platform leveraging artificial intelligence to transform education. We empower students with personalized skill-based learning and provide instructors with tools to manage resources efficiently.
        </p>
      </section>

      {/* Features Section */}
      <section className="section features-section">
        <h1 className="fade-up slide-in">Why IgnitEd?</h1>
        <div className="features">
          <div className="feature-card glow-on-hover">
            <FaTools className="feature-icon pulse" />
            <h3>Resource Management</h3>
            <p>Streamline schedules, allocations, and insights with AI for unmatched efficiency.</p>
          </div>
          <div className="feature-card glow-on-hover">
            <FaBook className="feature-icon pulse" />
            <h3>Skill-Based Learning</h3>
            <p>Gain practical skills with AI-tailored modules designed for real-world success.</p>
          </div>
          <div className="feature-card glow-on-hover">
            <FaBrain className="feature-icon pulse" />
            <h3>AI Insights</h3>
            <p>Personalized learning and management powered by intelligent AI analytics.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section how-it-works">
        <h1 className="fade-up slide-in">How It Works</h1>
        <div className="steps">
          <div className="step-card glow-on-hover">
            <FaRocket className="step-icon pulse" />
            <h3>Sign Up</h3>
            <p>Start as an Instructor or Student with a simple click.</p>
          </div>
          <div className="step-card glow-on-hover">
            <FaChartLine className="step-icon pulse" />
            <h3>Personalize</h3>
            <p>AI customizes your learning or management experience.</p>
          </div>
          <div className="step-card glow-on-hover">
            <FaUsers className="step-icon pulse" />
            <h3>Thrive</h3>
            <p>Excel with smart tools and resources.</p>
          </div>
        </div>
        <div className="section-image-container">
          <img
            src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
            alt="Education Process"
            className="section-image fade-up slide-in"
          />
        </div>
      </section>

      {/* Education Section */}
      <section className="section education">
        <h1 className="fade-up slide-in">Explore IgnitEd</h1>
        <p className="fade-up slide-in">
          An AI-driven ecosystem built to empower students and instructors with cutting-edge tools.
        </p>
        <ul className="education-list">
          <li className="education-item glow-on-hover"><FaBrain /> Personalized Learning Paths</li>
          <li className="education-item glow-on-hover"><FaTools /> Resource Optimization</li>
          <li className="education-item glow-on-hover"><FaBook /> Skill Development</li>
          <li className="education-item glow-on-hover"><FaChartLine /> Real-Time Analytics</li>
          <li className="education-item glow-on-hover"><FaRocket /> Scalable Solutions</li>
        </ul>
        <div className="section-image-container">
          <img
            src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
            alt="Learning Ecosystem"
            className="section-image fade-up slide-in"
          />
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="section contact-section" id="contact">
        <h1 className="fade-up slide-in">Contact Us</h1>
        <p className="fade-up slide-in">
          Have questions? Reach out to us at <a href="mailto:support@IgnitEd.com">support@IgnitEd.com</a> or call us at (123) 456-7890. We’re here to help!
        </p>
      </section>
    </div>
  );
}