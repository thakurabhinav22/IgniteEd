import React, { useState, useEffect } from 'react';
import './addTeam.css';
import { FaEye, FaPlus } from 'react-icons/fa';
import AdminSidebar from './adminSideBar';
import Cookies from 'js-cookie';
import { auth, database } from './firebase';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function AddTeam() {
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showMemberPopup, setShowMemberPopup] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [memberData, setMemberData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [teamCount, setTeamCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userSessionCredAd = Cookies.get('userSessionCredAd');
    if (!userSessionCredAd) {
      setError('No session found, please log in');
      navigate('/Admin');
      return;
    }

    let adminIdFromCookie;
    try {
      const parsedToken = JSON.parse(userSessionCredAd);
      adminIdFromCookie = parsedToken.uid || parsedToken;
    } catch (jsonError) {
      adminIdFromCookie = userSessionCredAd; // Fallback to raw value if not JSON
    }

    if (!adminIdFromCookie) {
      setError('Invalid session data');
      navigate('/Admin');
      return;
    }

    setAdminId(adminIdFromCookie);

    // Check admin status
    const userRef = ref(database, `admin/${adminIdFromCookie}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setIsAdmin(!!userData.isAdmin);
        if (!userData.isAdmin) {
          setError('Only admins can manage teams');
          navigate('/Admin/Dashboard');
          return;
        }
      } else {
        setError('User data not found');
        navigate('/Admin');
        return;
      }
    }, (err) => {
      setError(`Failed to verify user: ${err.message}`);
      navigate('/Admin');
    });

    // Fetch team data
    setIsLoading(true);
    const teamRef = ref(database, `admin/${adminIdFromCookie}/team`);
    const unsubscribeTeam = onValue(teamRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teams = Object.entries(data).map(([id, team]) => ({ id, ...team }));
        setTeamData(teams);
        setTeamCount(teams.length);
      } else {
        setTeamData([]);
        setTeamCount(0);
      }
      setIsLoading(false);
    }, (err) => {
      setError(`Failed to fetch team data: ${err.message}`);
      setIsLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTeam();
    };
  }, [navigate]);

  const handleViewCourses = (team) => {
    alert(`Viewing courses for ${team.name || 'Unnamed Team'}`);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (newTeamName.trim().length < 3) {
      setError('Team name must be at least 3 characters long');
      return;
    }
    if (!adminId) {
      setError('Admin not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const teamEmail = `${newTeamName.toLowerCase().replace(' ', '')}@team.com`;
      const teamPassword = Math.random().toString(36).slice(-8);

      if (!auth.currentUser) {
        throw new Error('Admin must be signed in to create a team');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, teamEmail, teamPassword);
      const user = userCredential.user;

      await set(ref(database, `admin/${adminId}/team/${user.uid}`), {
        name: newTeamName,
        email: teamEmail,
        totalCourses: 0,
        courses: {},
        createdAt: serverTimestamp()
      });

      setShowPopup(false);
      setNewTeamName('');
      setError('');
    } catch (err) {
      setError(`Failed to create team: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { name, email, password, confirmPassword } = memberData;

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email format');
      return;
    }
    if (!adminId) {
      setError('Admin not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('Admin must be signed in to add a member');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await set(ref(database, `admin/${adminId}/team/${user.uid}`), {
        name,
        email,
        totalCourses: 0,
        createdAt: serverTimestamp()
      });

      setShowMemberPopup(false);
      setMemberData({ name: '', email: '', password: '', confirmPassword: '' });
      setError('');
    } catch (err) {
      setError(`Failed to add member: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = teamData.filter(team => 
    (team.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (team.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="add-team-wrapper">
      <AdminSidebar />
      <div className="add-team-container">
        <div className="table-controls">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div>Total Team Members: {teamCount}</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isLoading ? (
          <div>Loading team data...</div>
        ) : (
          <table className="courses-table">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Name</th>
                <th>Mail ID</th>
                <th>Total Courses Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((team, index) => (
                <tr key={team.id}>
                  <td>{index + 1}</td>
                  <td>{team.Name || 'Unnamed'}</td>
                  <td>{team.email || 'No Email'}</td>
                  <td>{team.totalCourses || 0}</td>
                  <td>
                    <button 
                      className="view-btn"
                      onClick={() => handleViewCourses(team)}
                      title="View Courses"
                      disabled={isLoading}
                    >
                      <FaEye />
                    </button>
                    <button 
                      className="create-team-btn"
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowPopup(true);
                      }}
                      disabled={isLoading}
                    >
                      Create Team
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button 
          className="floating-btn"
          onClick={() => setShowMemberPopup(true)}
          title="Add New Member"
          disabled={isLoading}
        >
          <FaPlus />
        </button>

        {showPopup && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h2>Create Team for {selectedTeam?.name || 'Unnamed'}</h2>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleCreateTeam}>
                <div className="form-group">
                  <label htmlFor="teamName">Team Name</label>
                  <input
                    type="text"
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="popup-actions">
                  <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => {
                      setShowPopup(false);
                      setError('');
                      setNewTeamName('');
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMemberPopup && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h2>Add New Member</h2>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleAddMember}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={memberData.name}
                    onChange={(e) => setMemberData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter name"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={memberData.email}
                    onChange={(e) => setMemberData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={memberData.password}
                    onChange={(e) => setMemberData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={memberData.confirmPassword}
                    onChange={(e) => setMemberData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="popup-actions">
                  <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Member'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => {
                      setShowMemberPopup(false);
                      setError('');
                      setMemberData({ name: '', email: '', password: '', confirmPassword: '' });
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}