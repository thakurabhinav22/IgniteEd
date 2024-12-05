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


const router = createBrowserRouter([
  {
    path: "/",
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

]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

reportWebVitals();
