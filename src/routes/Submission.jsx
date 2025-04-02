import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import MainNavbar from '../components/MainNavbar';
import Friends from '../components/Friends';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const SubmissionDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [categoryCount, setCategoryCount] = useState({});
  const [difficultyCount, setDifficultyCount] = useState({});
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await axios.get('https://finalyearprojectbackend-2lbw.onrender.com/api/user/submission', {
          headers: { id: currentUser._id },
        });
        setSubmissions(res.data);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      }
    };

    if (currentUser?._id) {
      fetchSubmissions();
    }
  }, [currentUser]);

  // Aggregate data for charts
  useEffect(() => {
    const catCount = {};
    const diffCount = {};

    submissions.forEach((sub) => {
      const cat = sub.questionId?.category || 'Unknown';
      const diff = sub.questionId?.difficulty || 'Unknown';
      catCount[cat] = (catCount[cat] || 0) + 1;
      diffCount[diff] = (diffCount[diff] || 0) + 1;
    });

    setCategoryCount(catCount);
    setDifficultyCount(diffCount);
  }, [submissions]);

  // Data for the category pie chart
  const categoryData = {
    labels: Object.keys(categoryCount),
    datasets: [
      {
        label: 'Submissions by Category',
        data: Object.values(categoryCount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Data for the difficulty bar chart
  const difficultyData = {
    labels: Object.keys(difficultyCount),
    datasets: [
      {
        label: 'Submissions by Difficulty',
        data: Object.values(difficultyCount),
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options for dark theme
  const pieOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
    },
  };

  const barOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
    },
  };

  return (
    <div>
      <MainNavbar />
      <div className="min-h-screen w-full bg-[#262646] text-white p-6 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-center">Submissions</h1>

        {/* Charts Section */}
        <div className="w-4/5 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col" style={{ height: '34vh' }}>
              <h2 className="text-xl font-semibold mb-4 text-center">
                Submissions by Category
              </h2>
              <div className="flex-grow flex items-center justify-center">
                <Pie data={categoryData} options={pieOptions} />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col" style={{ height: '34vh' }}>
              <h2 className="text-xl font-semibold mb-4 text-center">
                Submissions by Difficulty
              </h2>
              <div className="flex-grow flex items-center justify-center">
                <Bar data={difficultyData} options={barOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* LeetCode-like Submissions Table */}
        <div className="bg-gray-800 rounded-lg shadow p-4 overflow-x-auto w-4/5">
          <h2 className="text-2xl font-semibold mb-4 text-center">Solved Questions</h2>
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-2 border">Question Name</th>
                <th className="px-4 py-2 border">Category</th>
                <th className="px-4 py-2 border">Difficulty</th>
                <th className="px-4 py-2 border">Language</th>
                <th className="px-4 py-2 border">Submitted On</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr key={idx} className="hover:bg-gray-600 text-center">
                  <td className="px-4 py-2 border">
                    {sub.questionName || (sub.questionId && sub.questionId.title)}
                  </td>
                  <td className="px-4 py-2 border">
                    {sub.questionId ? sub.questionId.category : 'N/A'}
                  </td>
                  <td className="px-4 py-2 border">
                    {sub.questionId ? sub.questionId.difficulty : 'N/A'}
                  </td>
                  <td className="px-4 py-2 border">{sub.language}</td>
                  <td className="px-4 py-2 border">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Friends />
      </div>
    </div>
  );
};

export default SubmissionDashboard;
