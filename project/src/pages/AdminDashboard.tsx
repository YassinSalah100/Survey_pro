import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, Clock, Filter, Search, Calendar, ArrowUp, ArrowDown, Award, Target, UserCheck, Brain, ChevronRight, ChevronDown } from 'lucide-react';

const AdminDashboard = () => {
  const [selectedSurvey, setSelectedSurvey] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [showSurveyList, setShowSurveyList] = useState(false);

  const surveys = [
    { id: 'all', name: 'All Surveys' },
    { id: 'customer-feedback', name: 'Customer Feedback Survey' },
    { id: 'employee-satisfaction', name: 'Employee Satisfaction Survey' },
    { id: 'product-feedback', name: 'Product Feedback Survey' },
    { id: 'market-research', name: 'Market Research Survey' },
  ];

  const timeRanges = [
    { id: 'day', name: 'Last 24 Hours' },
    { id: 'week', name: 'Last 7 Days' },
    { id: 'month', name: 'Last 30 Days' },
    { id: 'quarter', name: 'Last Quarter' },
  ];

  const responseData = [
    { name: 'Mon', responses: 120, completionRate: 85, avgTime: 4.2 },
    { name: 'Tue', responses: 150, completionRate: 88, avgTime: 3.8 },
    { name: 'Wed', responses: 180, completionRate: 92, avgTime: 4.0 },
    { name: 'Thu', responses: 140, completionRate: 87, avgTime: 4.5 },
    { name: 'Fri', responses: 200, completionRate: 90, avgTime: 3.9 },
    { name: 'Sat', responses: 90, completionRate: 83, avgTime: 4.8 },
    { name: 'Sun', responses: 80, completionRate: 80, avgTime: 5.0 },
  ];

  const categoryData = [
    { name: 'Very Satisfied', value: 400, color: '#0088FE' },
    { name: 'Satisfied', value: 300, color: '#00C49F' },
    { name: 'Neutral', value: 200, color: '#FFBB28' },
    { name: 'Dissatisfied', value: 100, color: '#FF8042' },
  ];

  const demographicData = [
    { name: '18-24', male: 20, female: 25, other: 5 },
    { name: '25-34', male: 40, female: 35, other: 8 },
    { name: '35-44', male: 30, female: 32, other: 6 },
    { name: '45-54', male: 25, female: 28, other: 4 },
    { name: '55+', male: 15, female: 18, other: 3 },
  ];

  const stats = [
    {
      title: 'Total Responses',
      value: '2,847',
      trend: '+12.5%',
      isPositive: true,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Completion Rate',
      value: '87%',
      trend: '+2.4%',
      isPositive: true,
      icon: Target,
      color: 'bg-green-500',
    },
    {
      title: 'Avg. Response Time',
      value: '4.2 min',
      trend: '-0.3 min',
      isPositive: true,
      icon: Clock,
      color: 'bg-purple-500',
    },
    {
      title: 'Engagement Score',
      value: '8.4/10',
      trend: '+0.6',
      isPositive: true,
      icon: Brain,
      color: 'bg-pink-500',
    },
  ];

  const recentResponses = [
    { id: 1, user: 'John Doe', survey: 'Customer Feedback', time: '5 mins ago', score: 9 },
    { id: 2, user: 'Jane Smith', survey: 'Product Feedback', time: '12 mins ago', score: 8 },
    { id: 3, user: 'Mike Johnson', survey: 'Employee Satisfaction', time: '25 mins ago', score: 7 },
    { id: 4, user: 'Sarah Wilson', survey: 'Market Research', time: '45 mins ago', score: 9 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive survey analytics and insights</p>
        </div>

        {/* Filters */}
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <button
              onClick={() => setShowSurveyList(!showSurveyList)}
              className="w-full sm:w-64 flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="flex items-center">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-700">{surveys.find(s => s.id === selectedSurvey)?.name}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {showSurveyList && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200">
                {surveys.map((survey) => (
                  <button
                    key={survey.id}
                    onClick={() => {
                      setSelectedSurvey(survey.id);
                      setShowSurveyList(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {survey.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {timeRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className={`flex items-center ${stat.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {stat.isPositive ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                <span className="text-sm font-medium">{stat.trend}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Response Trends */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Response Trends</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Last 7 days</span>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="w-full h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseData}>
                <defs>
                  <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="responses" stroke="#8884d8" fillOpacity={1} fill="url(#responseGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographic Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Demographics</h2>
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="w-full h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographicData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="male" fill="#3B82F6" />
                <Bar dataKey="female" fill="#EC4899" />
                <Bar dataKey="other" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Satisfaction Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-md lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Satisfaction Distribution</h2>
          <div className="w-full h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Responses */}
        <div className="bg-white p-6 rounded-xl shadow-md lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Responses</h2>
            <button className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentResponses.map((response) => (
                  <tr key={response.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{response.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.survey}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        response.score >= 8 ? 'bg-green-100 text-green-800' :
                        response.score >= 6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {response.score}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;