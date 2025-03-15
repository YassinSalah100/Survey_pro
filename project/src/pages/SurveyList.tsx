"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Search, Clock, Users, Star, TrendingUp, ChevronRight } from "lucide-react"

// Define types based on the API
interface Survey {
  id: string
  title: string
  description: string
  coverImageUrl?: string
  isActive: boolean
  createdAt: string
  createdBy: string
  updatedAt?: string
  questions: Question[]
}

interface Question {
  id: string
  title: string
  description?: string
  type: string
  options?: string[]
  isRequired: boolean
  imageUrl?: string
}

const categories = [
  { id: 1, name: "Customer Feedback", color: "bg-blue-100", icon: Users },
  { id: 2, name: "Employee Satisfaction", color: "bg-green-100", icon: Star },
  { id: 3, name: "Market Research", color: "bg-purple-100", icon: TrendingUp },
  { id: 4, name: "Product Development", color: "bg-yellow-100", icon: ClipboardList },
]

// Helper function to categorize surveys
const categorizeSurvey = (survey: Survey) => {
  // Simple categorization logic based on title or description
  const text = (survey.title + " " + survey.description).toLowerCase()

  if (text.includes("customer") || text.includes("service") || text.includes("feedback")) {
    return "Customer Feedback"
  } else if (text.includes("employee") || text.includes("work") || text.includes("satisfaction")) {
    return "Employee Satisfaction"
  } else if (text.includes("market") || text.includes("research") || text.includes("trend")) {
    return "Market Research"
  } else if (text.includes("product") || text.includes("development") || text.includes("feature")) {
    return "Product Development"
  }

  // Default category
  return "Customer Feedback"
}

// Helper function to generate tags from survey content
const generateTags = (survey: Survey) => {
  const tags = new Set<string>()

  // Add tags based on question types
  survey.questions.forEach((q) => {
    if (q.type === "MULTIPLE_CHOICE") tags.add("Multiple Choice")
    if (q.type === "TEXT") tags.add("Text Response")
    if (q.type === "CHECKBOX") tags.add("Checkbox")
  })

  // Add tags based on content
  const text = (survey.title + " " + survey.description).toLowerCase()
  if (text.includes("feedback")) tags.add("Feedback")
  if (text.includes("customer")) tags.add("Customer")
  if (text.includes("employee")) tags.add("Employee")
  if (text.includes("product")) tags.add("Product")

  return Array.from(tags).slice(0, 3) // Limit to 3 tags
}

const SurveyList = () => {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    try {
      const userStr = localStorage.getItem("user")
      console.log("User from localStorage:", userStr)

      if (!userStr) {
        console.log("No user found in localStorage")
        setIsAdmin(false)
        return
      }

      const user = JSON.parse(userStr)
      console.log("Parsed user:", user)
      console.log("User roles:", user.roles)

      // Check for admin role with case insensitivity
      const isUserAdmin =
        Array.isArray(user.roles) &&
        user.roles.some((role) => typeof role === "string" && role.toLowerCase() === "admin")

      console.log("Is user admin:", isUserAdmin)
      setIsAdmin(isUserAdmin)
    } catch (err) {
      console.error("Error checking admin status:", err)
      setIsAdmin(false)
    }
  }, [])

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/surveys")

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        setSurveys(data)
      } catch (err) {
        console.error("Error fetching surveys:", err)
        setError("Failed to load surveys. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [])

  const handleDeleteSurvey = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this survey?")) {
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`/api/surveys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete survey: ${response.status}`)
      }

      // Remove the deleted survey from the state
      setSurveys(surveys.filter((survey) => survey.id !== id))
    } catch (err) {
      console.error("Error deleting survey:", err)
      setError("Failed to delete survey. Please try again.")
    }
  }

  // Process surveys to add category and tags
  const processedSurveys = surveys.map((survey) => ({
    ...survey,
    category: categorizeSurvey(survey),
    tags: generateTags(survey),
    questions: survey.questions || [],
    duration: `${Math.max(2, Math.ceil(survey.questions?.length || 0 / 2))} mins`,
    participants: Math.floor(Math.random() * 300) + 50, // Random number for demo
    rating: (4 + Math.random()).toFixed(1), // Random rating between 4.0-5.0
    featured: Math.random() > 0.7, // 30% chance of being featured
  }))

  const filteredSurveys = processedSurveys.filter((survey) => {
    const matchesCategory = selectedCategory === "all" || survey.category === selectedCategory
    const matchesSearch =
      survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Available Surveys</h1>
          <p className="mt-2 text-gray-600">Participate in surveys and help shape the future</p>
        </div>

        {/* Search Bar */}
        <div className="mt-4 md:mt-0 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search surveys..."
              className="pl-10 pr-4 py-2 w-full md:w-64 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.name
                  ? "bg-indigo-600 text-white"
                  : `${category.color} text-gray-800 hover:opacity-80`
              }`}
            >
              <category.icon className="h-4 w-4 mr-2" />
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading surveys...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-10">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg inline-block">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-indigo-600 hover:underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Survey Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 pb-20">
          {filteredSurveys.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600">No surveys found matching your criteria.</p>
            </div>
          ) : (
            filteredSurveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {survey.featured && (
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                            Featured
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                          {survey.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{survey.title}</h3>
                      <p className="text-gray-600 mb-4">{survey.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {survey.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4 sm:mb-0">
                        <div className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-1" />
                          <span>{survey.questions.length} questions</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{survey.duration}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{survey.participants} participants</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-400" />
                          <span>{survey.rating} rating</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteSurvey(survey.id, e)}
                          className="w-full sm:w-auto group px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                          aria-label="Delete survey"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-1"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                          <span>Delete</span>
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/surveys/${survey.id}`)}
                        className="w-full sm:w-auto group px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>Take Survey</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default SurveyList

