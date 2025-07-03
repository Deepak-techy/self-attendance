// src/App.jsx
import React, { useState, useEffect } from 'react';
import { format, isSameDay, isAfter, parseISO } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const App = () => {
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewingMonth, setViewingMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (user) {
      const userKey = `attendanceData_${user.sub}`;
      const storedData = JSON.parse(localStorage.getItem(userKey)) || [];
      setAttendance(storedData);
    }
  }, [user]);

  const handleToggleAttendance = () => {
    if (isAfter(selectedDate, new Date())) return;
    if (!user) return;

    const userKey = `attendanceData_${user.sub}`;
    const alreadyMarkedIndex = attendance.findIndex(entry =>
      isSameDay(new Date(entry.date), selectedDate)
    );

    let newAttendance;

    if (alreadyMarkedIndex !== -1) {
      newAttendance = [...attendance];
      newAttendance.splice(alreadyMarkedIndex, 1);
    } else {
      const now = new Date();
      const entry = {
        date: selectedDate.toISOString(),
        time: now.toTimeString().split(' ')[0],
      };
      newAttendance = [entry, ...attendance];
    }

    setAttendance(newAttendance);
    localStorage.setItem(userKey, JSON.stringify(newAttendance));
  };

  const handleExportCSV = () => {
    const csvRows = ["Date,Time"];
    attendance.forEach(entry => {
      const date = format(new Date(entry.date), 'yyyy-MM-dd');
      csvRows.push(`${date},${entry.time}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'attendance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAttendance = attendance.filter(entry =>
    format(parseISO(entry.date), 'yyyy-MM') === viewingMonth
  );

  const generateChartData = () => {
    const year = parseInt(viewingMonth.split('-')[0]);
    const month = parseInt(viewingMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const counts = days.map(day => {
      return filteredAttendance.filter(entry => {
        const date = parseISO(entry.date);
        return date.getDate() === day;
      }).length;
    });

    return {
      labels: days.map(day => `${day}`),
      datasets: [
        {
          label: 'Attendance Days',
          data: counts,
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderRadius: 6,
        },
      ],
    };
  };

  const isAttendanceMarked = attendance.some(entry => isSameDay(new Date(entry.date), selectedDate));
  const uniqueDaysPresent = new Set(attendance.map(entry => format(new Date(entry.date), 'yyyy-MM-dd'))).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 to-purple-300 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="bg-white shadow-2xl rounded-2xl p-4 sm:p-6 w-full max-w-[1200px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700">Self Attendance App</h1>
          {user ? (
            <div className="text-sm sm:text-right w-full sm:w-auto">
              <p className="text-gray-700 mb-1">Logged in as <strong>{user.name}</strong></p>
              <button
                onClick={() => { googleLogout(); setUser(null); }}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow transition duration-300"
              >
                Logout
              </button>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={credentialResponse => {
                const decoded = jwtDecode(credentialResponse.credential);
                setUser(decoded);
              }}
              onError={() => {
                console.log("Login Failed");
              }}
            />
          )}
        </div>

        {user && (
          <>
            <div className="flex flex-col lg:flex-row gap-6 justify-between">
              <div className="w-full lg:w-1/2 xl:w-1/3">
                <h2 className="text-lg font-semibold mb-2 text-indigo-800">Select a Date</h2>
                <Calendar
                  onChange={date => {
                    setSelectedDate(date);
                    setViewingMonth(format(date, 'yyyy-MM'));
                  }}
                  value={selectedDate}
                  tileDisabled={({ date }) => isAfter(date, new Date())}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    setViewingMonth(format(activeStartDate, 'yyyy-MM'));
                  }}
                />
                <button
                  onClick={handleToggleAttendance}
                  className={`mt-4 w-full py-2 px-4 rounded-xl text-white text-lg ${
                    isAttendanceMarked
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isAttendanceMarked ? 'Unmark Attendance' : 'Mark Attendance'}
                </button>
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                  <h2 className="text-lg font-semibold text-indigo-800">Attendance History</h2>
                  <button
                    onClick={handleExportCSV}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-md text-sm"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {attendance.length === 0 ? (
                    <p className="text-gray-600">No attendance records yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {attendance.map((entry, index) => (
                        <li key={index} className="bg-indigo-50 rounded-lg p-3 shadow text-sm">
                          <strong className="text-indigo-900">{format(new Date(entry.date), 'PPP')}</strong> at {entry.time}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="mt-3 text-indigo-800 font-medium">Total Days Present: {uniqueDaysPresent}</p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-indigo-900 text-center">{format(new Date(viewingMonth + '-01'), 'MMMM yyyy')} Attendance Analytics</h2>
              <div className="w-full overflow-x-auto">
                <Bar data={generateChartData()} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
