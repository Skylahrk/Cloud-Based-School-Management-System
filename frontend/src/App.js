import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Award, 
  Bell, 
  BarChart3, 
  Settings, 
  LogOut,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Home,
  FileText,
  User
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext(null);

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      toast.success(`Welcome back, ${userData.full_name}!`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    toast.info('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Page
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="login-title">School Management System</h1>
          <p className="login-subtitle">Sign in to access your dashboard</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              data-testid="username-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              data-testid="password-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            data-testid="login-button"
            className="w-full login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="demo-credentials">
          <p className="text-sm font-semibold mb-2">Demo Credentials:</p>
          <div className="credentials-grid">
            <div><strong>Admin:</strong> admin / admin123</div>
            <div><strong>Teacher:</strong> teacher1 / teacher123</div>
            <div><strong>Student:</strong> student1 / student123</div>
            <div><strong>Parent:</strong> parent1 / parent123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Layout
const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-gradient-to-r from-rose-500 to-orange-500',
      teacher: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      student: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      parent: 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  // Check if user can access a tab
  const canAccessTab = (tab) => {
    const role = user?.role;
    
    switch(tab) {
      case 'overview':
        return true; // All roles can see overview
      case 'students':
        return role === 'admin' || role === 'teacher';
      case 'attendance':
        return role === 'admin' || role === 'teacher' || role === 'student';
      case 'grades':
        return role === 'admin' || role === 'teacher' || role === 'student';
      case 'communication':
        return true; // All roles can see announcements
      default:
        return false;
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="sidebar-title">SMS</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            data-testid="overview-nav"
          >
            <Home className="h-5 w-5" />
            <span>Overview</span>
          </button>
          
          {canAccessTab('students') && (
            <button 
              onClick={() => setActiveTab('students')} 
              className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
              data-testid="students-nav"
            >
              <Users className="h-5 w-5" />
              <span>Students</span>
            </button>
          )}
          
          {canAccessTab('attendance') && (
            <button 
              onClick={() => setActiveTab('attendance')} 
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              data-testid="attendance-nav"
            >
              <CalendarIcon className="h-5 w-5" />
              <span>Attendance</span>
            </button>
          )}
          
          {canAccessTab('grades') && (
            <button 
              onClick={() => setActiveTab('grades')} 
              className={`nav-item ${activeTab === 'grades' ? 'active' : ''}`}
              data-testid="grades-nav"
            >
              <Award className="h-5 w-5" />
              <span>Grades</span>
            </button>
          )}
          
          {canAccessTab('communication') && (
            <button 
              onClick={() => setActiveTab('communication')} 
              className={`nav-item ${activeTab === 'communication' ? 'active' : ''}`}
              data-testid="communication-nav"
            >
              <Bell className="h-5 w-5" />
              <span>Announcements</span>
            </button>
          )}
        </nav>
        
        <div className="sidebar-footer">
          <Button 
            onClick={logout} 
            variant="ghost" 
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid="logout-button"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-heading">Welcome back, {user?.full_name}!</h1>
            <p className="dashboard-subheading">Here's what's happening with your school today.</p>
          </div>
          
          <div className="header-actions">
            <Badge className={`role-badge ${getRoleColor(user?.role)}`}>
              {user?.role?.toUpperCase()}
            </Badge>
            <Avatar className="avatar-lg">
              <AvatarFallback className={getRoleColor(user?.role)}>
                {user?.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        
        <div className="dashboard-content">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'students' && canAccessTab('students') && <StudentsTab />}
          {activeTab === 'attendance' && canAccessTab('attendance') && <AttendanceTab />}
          {activeTab === 'grades' && canAccessTab('grades') && <GradesTab />}
          {activeTab === 'communication' && canAccessTab('communication') && <CommunicationTab />}
        </div>
      </main>
    </div>
  );
};

// Overview Tab
const OverviewTab = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatsCards = () => {
    if (user.role === 'admin') {
      return [
        { title: 'Total Students', value: stats.total_students || 0, icon: Users, color: 'from-blue-500 to-cyan-500' },
        { title: 'Total Teachers', value: stats.total_teachers || 0, icon: GraduationCap, color: 'from-emerald-500 to-teal-500' },
        { title: 'Total Parents', value: stats.total_parents || 0, icon: User, color: 'from-violet-500 to-fuchsia-500' },
        { title: 'Announcements', value: stats.total_announcements || 0, icon: Bell, color: 'from-rose-500 to-orange-500' },
      ];
    } else if (user.role === 'teacher') {
      return [
        { title: 'Total Students', value: stats.total_students || 0, icon: Users, color: 'from-blue-500 to-cyan-500' },
        { title: 'Classes Today', value: stats.classes_today || 0, icon: BookOpen, color: 'from-emerald-500 to-teal-500' },
        { title: 'Pending Grades', value: stats.pending_grades || 0, icon: FileText, color: 'from-amber-500 to-yellow-500' },
      ];
    } else if (user.role === 'student') {
      return [
        { title: 'Total Attendance', value: stats.total_attendance || 0, icon: CalendarIcon, color: 'from-blue-500 to-cyan-500' },
        { title: 'Present Days', value: stats.present_days || 0, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
        { title: 'Total Grades', value: stats.total_grades || 0, icon: Award, color: 'from-violet-500 to-fuchsia-500' },
      ];
    }
    return [];
  };

  return (
    <div className="overview-container">
      <div className="stats-grid">
        {getStatsCards().map((stat, index) => (
          <Card key={index} className="stat-card" data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="stat-content">
                <div>
                  <p className="stat-label">{stat.title}</p>
                  <h3 className="stat-value">{stat.value}</h3>
                </div>
                <div className={`stat-icon bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="welcome-banner">
        <div className="banner-content">
          <h2 className="banner-title">🎓 Welcome to School Management System</h2>
          <p className="banner-text">
            Manage your school operations efficiently with our comprehensive platform. 
            Track attendance, manage grades, communicate with stakeholders, and more!
          </p>
        </div>
      </div>
    </div>
  );
};

// Students Tab
const StudentsTab = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    class_name: '',
    section: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/students`, formData);
      toast.success('Student added successfully!');
      setIsDialogOpen(false);
      setFormData({ full_name: '', roll_number: '', class_name: '', section: '', phone: '', address: '' });
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add student');
    }
  };

  return (
    <div className="students-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Student Management</h2>
          <p className="section-description">Manage student information and records</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="add-button" data-testid="add-student-button">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>Enter student details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    data-testid="student-name-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Roll Number</Label>
                  <Input
                    data-testid="student-roll-input"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({...formData, roll_number: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Class</Label>
                  <Input
                    data-testid="student-class-input"
                    value={formData.class_name}
                    onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                    placeholder="e.g., 10"
                    required
                  />
                </div>
                <div>
                  <Label>Section</Label>
                  <Input
                    data-testid="student-section-input"
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value})}
                    placeholder="e.g., A"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  data-testid="student-phone-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  data-testid="student-address-input"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full" data-testid="submit-student-button">
                Add Student
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="table-container">
        <table className="data-table" data-testid="students-table">
          <thead>
            <tr>
              <th>Roll No.</th>
              <th>Name</th>
              <th>Class</th>
              <th>Section</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.roll_number}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500">
                        {student.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{student.full_name}</span>
                  </div>
                </td>
                <td>{student.class_name}</td>
                <td>{student.section}</td>
                <td>{student.phone || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && !loading && (
          <div className="empty-state">
            <Users className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No students found. Add your first student!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Attendance Tab
const AttendanceTab = () => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [myStudentId, setMyStudentId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present'
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      fetchStudents();
    }
    fetchAttendance();
  }, [user]);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      // If student, fetch only their own attendance
      if (user?.role === 'student') {
        // First get student record for this user
        const studentsResponse = await axios.get(`${API}/students`);
        const studentRecord = studentsResponse.data.find(s => s.user_id === user.id);
        
        if (studentRecord) {
          setMyStudentId(studentRecord.id);
          const response = await axios.get(`${API}/attendance?student_id=${studentRecord.id}`);
          setAttendanceRecords(response.data);
        }
      } else {
        const response = await axios.get(`${API}/attendance`);
        setAttendanceRecords(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch attendance');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/attendance`, formData);
      toast.success('Attendance marked successfully!');
      setIsDialogOpen(false);
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      absent: 'bg-red-100 text-red-700 border-red-300',
      late: 'bg-amber-100 text-amber-700 border-amber-300'
    };
    return styles[status] || styles.present;
  };

  return (
    <div className="attendance-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Attendance Management</h2>
          <p className="section-description">Track daily student attendance</p>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="add-button" data-testid="mark-attendance-button">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
                <DialogDescription>Select student and status</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Student</Label>
                  <Select
                    data-testid="attendance-student-select"
                    onValueChange={(value) => {
                      const student = students.find(s => s.id === value);
                      setFormData({...formData, student_id: value, student_name: student?.full_name || ''});
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} - {student.roll_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    data-testid="attendance-date-input"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    data-testid="attendance-status-select"
                    onValueChange={(value) => setFormData({...formData, status: value})}
                    defaultValue="present"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" data-testid="submit-attendance-button">
                  Mark Attendance
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="attendance-stat">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Present</p>
                <h3 className="text-3xl font-bold text-emerald-600 mt-1">
                  {attendanceRecords.filter(r => r.status === 'present').length}
                </h3>
              </div>
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="attendance-stat">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Absent</p>
                <h3 className="text-3xl font-bold text-red-600 mt-1">
                  {attendanceRecords.filter(r => r.status === 'absent').length}
                </h3>
              </div>
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="attendance-stat">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
                <h3 className="text-3xl font-bold text-amber-600 mt-1">
                  {attendanceRecords.filter(r => r.status === 'late').length}
                </h3>
              </div>
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="table-container">
        <table className="data-table" data-testid="attendance-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.slice(0, 20).map((record) => (
              <tr key={record.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500">
                        {record.student_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{record.student_name}</span>
                  </div>
                </td>
                <td>{record.date}</td>
                <td>
                  <Badge className={`${getStatusBadge(record.status)} border`}>
                    {record.status.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {attendanceRecords.length === 0 && (
          <div className="empty-state">
            <CalendarIcon className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No attendance records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Grades Tab
const GradesTab = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    subject: '',
    exam_type: '',
    marks: '',
    max_marks: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchGrades();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await axios.get(`${API}/grades`);
      setGrades(response.data);
    } catch (error) {
      toast.error('Failed to fetch grades');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        marks: parseFloat(formData.marks),
        max_marks: parseFloat(formData.max_marks)
      };
      await axios.post(`${API}/grades`, payload);
      toast.success('Grade added successfully!');
      setIsDialogOpen(false);
      setFormData({ student_id: '', student_name: '', subject: '', exam_type: '', marks: '', max_marks: '', date: new Date().toISOString().split('T')[0] });
      fetchGrades();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add grade');
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="grades-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Grade Management</h2>
          <p className="section-description">Track student academic performance</p>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="add-button" data-testid="add-grade-button">
                <Award className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Grade</DialogTitle>
                <DialogDescription>Enter exam results</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Student</Label>
                  <Select
                    data-testid="grade-student-select"
                    onValueChange={(value) => {
                      const student = students.find(s => s.id === value);
                      setFormData({...formData, student_id: value, student_name: student?.full_name || ''});
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} - {student.roll_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <Input
                      data-testid="grade-subject-input"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="e.g., Mathematics"
                      required
                    />
                  </div>
                  <div>
                    <Label>Exam Type</Label>
                    <Input
                      data-testid="grade-exam-type-input"
                      value={formData.exam_type}
                      onChange={(e) => setFormData({...formData, exam_type: e.target.value})}
                      placeholder="e.g., Midterm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Marks Obtained</Label>
                    <Input
                      data-testid="grade-marks-input"
                      type="number"
                      value={formData.marks}
                      onChange={(e) => setFormData({...formData, marks: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Maximum Marks</Label>
                    <Input
                      data-testid="grade-max-marks-input"
                      type="number"
                      value={formData.max_marks}
                      onChange={(e) => setFormData({...formData, max_marks: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    data-testid="grade-date-input"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-grade-button">
                  Add Grade
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="table-container">
        <table className="data-table" data-testid="grades-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Subject</th>
              <th>Exam Type</th>
              <th>Marks</th>
              <th>Percentage</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => {
              const percentage = (grade.marks / grade.max_marks * 100).toFixed(1);
              return (
                <tr key={grade.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-rose-500 to-orange-500">
                          {grade.student_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{grade.student_name}</span>
                    </div>
                  </td>
                  <td>{grade.subject}</td>
                  <td>{grade.exam_type}</td>
                  <td>{grade.marks} / {grade.max_marks}</td>
                  <td>
                    <span className={`font-bold ${getGradeColor(parseFloat(percentage))}`}>
                      {percentage}%
                    </span>
                  </td>
                  <td>{grade.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {grades.length === 0 && (
          <div className="empty-state">
            <Award className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No grades recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Communication Tab
const CommunicationTab = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_role: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API}/announcements`);
      setAnnouncements(response.data);
    } catch (error) {
      toast.error('Failed to fetch announcements');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        target_role: formData.target_role || null
      };
      await axios.post(`${API}/announcements`, payload);
      toast.success('Announcement posted successfully!');
      setIsDialogOpen(false);
      setFormData({ title: '', content: '', target_role: '' });
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post announcement');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="communication-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Announcements</h2>
          <p className="section-description">Stay updated with latest news and updates</p>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="add-button" data-testid="create-announcement-button">
                <Bell className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>Share important updates</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    data-testid="announcement-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter announcement title"
                    required
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    data-testid="announcement-content-input"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Enter announcement details"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label>Target Audience (Optional)</Label>
                  <Select
                    data-testid="announcement-target-select"
                    onValueChange={(value) => setFormData({...formData, target_role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Users</SelectItem>
                      <SelectItem value="teacher">Teachers</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" data-testid="submit-announcement-button">
                  Post Announcement
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="announcements-list" data-testid="announcements-list">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="announcement-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{announcement.title}</CardTitle>
                  <CardDescription>
                    Posted by {announcement.author} • {formatDate(announcement.created_at)}
                    {announcement.target_role && (
                      <Badge className="ml-2 bg-blue-100 text-blue-700">
                        {announcement.target_role}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <Bell className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
            </CardContent>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="empty-state">
            <Bell className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No announcements yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Main App
function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
