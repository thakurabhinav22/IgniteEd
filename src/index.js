import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AdminDashboard from './Admin/AdminDashboard'
import Adminlogin from './Admin/Adminlogin';
import reportWebVitals from './reportWebVitals';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Dashboard from './UserComponents/Dashboard';
import SignUpForm from './UserComponents/SignupForm';
import CreateCourse from './Admin/CreateCourse';
import MagicEditor from "./Admin/magicEditor"
import PublishCourse from './Admin/publishCourse';
import Courses from './UserComponents/Module';
import LearningPage from './UserComponents/learningPage';
import SampleUploadtoGoogleDrive from "./UserComponents/SampleUploadtoGoogleDrive"
import ManagementDb from './Admin/ManagementDb';
import Homepage from './UserComponents/Homepage';
import Webcrawler from './Admin/webcrawler';
import MagicWritter from './Admin/MagicWritter';
import Stats from './UserComponents/Stats';




const router = createBrowserRouter([
  {
    path: "/",
    element: <Homepage />,
  },
  {
    path: "/login",
    element: <App />,
  },
  {
    path: "/Admin",
    element: <Adminlogin />,
  },
  {
    path: "/Admin/Dashboard",
    element: <AdminDashboard />,
  },
  {
    path: "/Admin/CreateCourse",
    element: <CreateCourse />,
  },
  {
    path: "/stats",
    element: <Stats />,
  },
  {
    path: "/Admin/ManageRepo",
    element: <ManagementDb />,
  },
  {
    path: "/Dashboard",
    element: <Dashboard />,
  },
  {
    path: "/Signin",
    element: <SignUpForm />,
  },
  {
    path: "/Admin/Magiceditor",
    element: <MagicEditor />,
  },
  {
    path: "/Admin/CreateCourse/publishcourse",
    element: <PublishCourse />,
  },
  {
    path: "/Courses",
    element: <Courses />,
  },
  {
    path: "/Courses/learn",
    element: <LearningPage />,
  },{
    path: "/uploads",
    element: <SampleUploadtoGoogleDrive />,
  },
  {
    path: "/Admin/webcrawler",
    element: <Webcrawler />,
  },
  {
    path: "/Admin/MagicWritter",
    element: <MagicWritter />,
  },
  
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

reportWebVitals();