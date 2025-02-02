import React from 'react';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="homepage">
      <header className="header">
        <div className="container">
          <div className="logo">
            LearnMax 
          </div>
          <nav>
            <a href="#">Courses</a>
            <a href="#">Labs</a>
            <a href="#">Pricing</a>
            <a href="#">Blog</a>
            <a href="#">Login</a>
            <a className="cta-button" href="#">Start Free</a>
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="hero text-center">
          <h1>Your learning journey starts here.</h1>
          <p>
            Access expert-designed courses, hands-on labs, and personalized feedback to master new skills and advance your career.
          </p>
          <div className="buttons">
            <a className="primary-button" href="#">Start for Free</a>
            <a className="secondary-button" href="#">Explore Courses</a>
          </div>
        </section>

        <section className="features">
          <h2>Why Choose LearnMax?</h2>
          <p>LearnMax offers a unique blend of expert-led courses, interactive labs, and real-world projects to help you achieve your learning goals.</p>
          <div className="feature-cards">
            <div className="card">
              <img alt="Course icon" height="100" src="https://storage.googleapis.com/a1aa/image/mc8YpfV0rib-g1-Ei7JC_tDBr0dOk0HFyfq4yIPNHEo.jpg" width="100" />
              <h2>Expert-Designed Courses</h2>
              <p>Learn from industry experts with courses tailored to your skill level.</p>
              <a href="#">View Courses</a>
            </div>
            <div className="card">
              <img alt="Lab icon" height="100" src="https://storage.googleapis.com/a1aa/image/yj0XtByWwBSxjlts-pwu_BlTv1PmGIdKsl_SApDP7yM.jpg" width="100" />
              <h2>Hands-On Labs</h2>
              <p>Practice your skills in real-world scenarios with interactive labs.</p>
              <a href="#">Explore Labs</a>
            </div>
            <div className="card">
              <img alt="Certification icon" height="100" src="https://storage.googleapis.com/a1aa/image/HvBsRfIJxZLc4SXfyRps9Qz6r8NaV69hNHdfuUaiyOE.jpg" width="100" />
              <h2>Certifications</h2>
              <p>Earn certifications to showcase your expertise to employers.</p>
              <a href="#">Learn More</a>
            </div>
          </div>
        </section>

        <section className="stats">
          <h2>Join Over 1.7 Million Learners</h2>
          <p>Be part of a global community advancing their skills with LearnMax.</p>
          <div className="logos">
            <img alt="Logo 1" height="50" src="https://storage.googleapis.com/a1aa/image/e678dYaeDTlbpyOGVg7YgG0fXU7RAUyfBTtGiagEFng.jpg" width="100" />
            <img alt="Logo 2" height="50" src="https://storage.googleapis.com/a1aa/image/e9eCHtYigJiEJPe6-0wKWcK5cv_h3BZHZ4mskdmh3_8.jpg" width="100" />
            <img alt="Logo 3" height="50" src="https://storage.googleapis.com/a1aa/image/HvBsRfIJxZLc4SXfyRps9Qz6r8NaV69hNHdfuUaiyOE.jpg" width="100" />
          </div>
        </section>

        <section className="cta text-center">
          <a className="primary-button" href="#">Start Learning Today</a>
          <a className="secondary-button" href="#">View All Courses</a>
        </section>
      </main>
    </div>
  );
}