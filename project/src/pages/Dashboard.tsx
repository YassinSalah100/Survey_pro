import React, { useState } from 'react';
import { ClipboardList, CheckCircle, Clock, Award, TrendingUp, Users, Calendar, ChevronRight, Filter } from 'lucide-react';

const Dashboard = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  const userStats = [
    { icon: Award, label: 'Surveys Completed', value: '12', trend: '+3 this month' },
    { icon: TrendingUp, label: 'Average Score', value: '85%', trend: '+5% from last month' },
    { icon: Users, label: 'Survey Responses', value: '248', trend: '+22 this week' },
    { icon: Calendar, label: 'Active Days', value: '28', trend: '90% completion rate' },
  ];

  const userSurveys = [
    {
      id: 1,
      title: 'Customer Experience Survey',
      category: 'Customer Feedback',
      status: 'Completed',
      completedAt: '2024-03-15',
      score: 85,
      responses: 45,
      timeSpent: '12m',
      badge: 'Expert Surveyor',
    },
    {
      id: 2,
      title: 'Product Feedback Survey',
      category: 'Product Development',
      status: 'In Progress',
      completedAt: null,
      progress: 60,
      responses: 28,
      timeSpent: '8m',
      dueDate: '2024-03-20',
    },
    {
      id: 3,
      title: 'Website Usability Survey',
      category: 'UX Research',
      status: 'Not Started',
      completedAt: null,
      progress: 0,
      expectedTime: '15m',
      dueDate: '2024-03-25',
    },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Surveys' },
    { value: 'completed', label: 'Completed' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'not-started', label: 'Not Started' },
  ];

  const filteredSurveys = userSurveys.filter(survey => {
    if (selectedFilter === 'all') return true;
    return survey.status.toLowerCase().replace(' ', '-') === selectedFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, Alex!</h1>
        <p className="text-lg text-gray-600">Your survey dashboard and progress tracker</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {userStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="h-8 w-8 text-indigo-600" />
              <span className="text-xs font-medium text-gray-500">{stat.trend}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <div className="flex space-x-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Surveys Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSurveys.map((survey) => (
          <div
            key={survey.id}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <ClipboardList className="h-10 w-10 text-indigo-600" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-semibold text-gray-900">{survey.title}</h3>
                      {survey.badge && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                          {survey.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{survey.category}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-6">
                  {survey.status === 'Completed' ? (
                    <>
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">Completed on {survey.completedAt}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="h-5 w-5 mr-2" />
                        <span className="text-sm">{survey.responses} responses</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2" />
                        <span className="text-sm">{survey.timeSpent} completion time</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {survey.status === 'In Progress' && (
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{survey.progress}% Complete</span>
                            <span className="text-sm text-gray-500">Due {survey.dueDate}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${survey.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {survey.status === 'Not Started' && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-5 w-5 mr-2" />
                          <span className="text-sm">Estimated time: {survey.expectedTime}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="ml-6 flex items-center">
                {survey.status === 'Completed' ? (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{survey.score}%</div>
                    <div className="text-sm text-gray-500">Score</div>
                  </div>
                ) : (
                  <button className="group px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
                    <span>{survey.status === 'In Progress' ? 'Continue' : 'Start Survey'}</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;