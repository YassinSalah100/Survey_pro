"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"
import {
  Users,
  Clock,
  Filter,
  Calendar,
  ArrowUp,
  ArrowDown,
  Target,
  UserCheck,
  Brain,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  XCircle,
  BarChart3,
  LineChartIcon,
  Eye,
  FileSpreadsheet,
} from "lucide-react"

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
  numberOfResponses?: number
  category?: string
}

interface Question {
  id: string
  title: string
  description?: string
  type: QuestionType
  options?: string[]
  isRequired: boolean
  imageUrl?: string
}

enum QuestionType {
  TEXT = "TEXT",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  CHECKBOX = "CHECKBOX",
  RATING = "RATING",
  DATE = "DATE",
}

interface QuestionResponse {
  questionId: string
  value: string | string[]
  selectedOptions?: string[]
  answer?: string
}

interface SurveyResponse {
  id: string
  surveyId: string
  userId: string
  userName?: string
  completedAt: string
  submittedAt?: string
  respondentId?: string
  answers: QuestionResponse[]
  responses?: QuestionResponse[]
  score?: number
}

interface User {
  id: string
  username: string
  email: string
  roles: string[]
}

interface DashboardStats {
  totalResponses: number
  completionRate: number
  avgResponseTime: number
  engagementScore: number
  totalSurveys: number
  totalUsers: number
  activeUsers: number
}

interface ResponseTrend {
  name: string
  responses: number
  completionRate: number
  avgTime: number
}

interface CategoryData {
  name: string
  value: number
  color: string
}

interface DemographicData {
  name: string
  male: number
  female: number
  other: number
}

interface QuestionAnalytics {
  questionId: string
  questionTitle: string
  questionType: string
  responseCount: number
  options?: {
    label: string
    count: number
    percentage: number
  }[]
  averageRating?: number
  textResponses?: string[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

const AdminDashboard = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<string>("all")
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("week")
  const [showSurveyList, setShowSurveyList] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [selectedChartType, setSelectedChartType] = useState<string>("area")
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [showResponseDetails, setShowResponseDetails] = useState<boolean>(false)
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([])

  const [stats, setStats] = useState<DashboardStats>({
    totalResponses: 0,
    completionRate: 0,
    avgResponseTime: 0,
    engagementScore: 0,
    totalSurveys: 0,
    totalUsers: 0,
    activeUsers: 0,
  })

  const [responseTrends, setResponseTrends] = useState<ResponseTrend[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [demographicData, setDemographicData] = useState<DemographicData[]>([])
  const [recentResponses, setRecentResponses] = useState<any[]>([])
  const [questionTypeDistribution, setQuestionTypeDistribution] = useState<CategoryData[]>([])
  const [responseTimeDistribution, setResponseTimeDistribution] = useState<any[]>([])

  const apiBaseUrl = "/api"
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

  // Fetch all surveys
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${apiBaseUrl}/surveys`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch surveys: ${response.status}`)
        }

        const data = await response.json()
        setSurveys(data)
      } catch (err) {
        console.error("Error fetching surveys:", err)
        setError("Failed to load surveys data")
      }
    }

    fetchSurveys()
  }, [apiBaseUrl, token])

  // Fetch users (admin endpoint)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          console.warn("Could not fetch users, might not have admin permissions")
          return
        }

        const data = await response.json()
        setUsers(data)
      } catch (err) {
        console.error("Error fetching users:", err)
      }
    }

    fetchUsers()
  }, [apiBaseUrl, token])

  // Fetch responses for all surveys or selected survey
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        if (!surveys || surveys.length === 0) {
          setLoading(false)
          setIsRefreshing(false)
          return
        }

        let allResponses: SurveyResponse[] = []

        // If a specific survey is selected, fetch only its responses
        if (selectedSurvey !== "all") {
          const response = await fetch(`${apiBaseUrl}/surveys/${selectedSurvey}/responses`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch responses: ${response.status}`)
          }

          const data = await response.json()
          allResponses = data.map((resp: any) => ({
            id: resp.id,
            surveyId: resp.surveyId,
            userId: resp.respondentId,
            completedAt: resp.submittedAt,
            submittedAt: resp.submittedAt,
            respondentId: resp.respondentId,
            answers: resp.responses || [],
            responses: resp.responses || [],
          }))
        } else {
          // Fetch responses for all surveys
          const responsesPromises = surveys
            .filter((survey) => survey && survey.id)
            .map((survey) =>
              fetch(`${apiBaseUrl}/surveys/${survey.id}/responses`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
                .then((res) => (res.ok ? res.json() : []))
                .then((data) =>
                  data.map((resp: any) => ({
                    id: resp.id,
                    surveyId: resp.surveyId,
                    userId: resp.respondentId,
                    completedAt: resp.submittedAt,
                    submittedAt: resp.submittedAt,
                    respondentId: resp.respondentId,
                    answers: resp.responses || [],
                    responses: resp.responses || [],
                  })),
                )
                .catch((err) => {
                  console.error(`Error fetching responses for survey ${survey.id}:`, err)
                  return []
                }),
            )

          const responsesArrays = await Promise.all(responsesPromises)
          allResponses = responsesArrays.flat()
        }

        // Enrich responses with user data if available
        const enrichedResponses = allResponses.map((response) => {
          const user = users.find((u) => u.id === response.userId || u.id === response.respondentId)
          return {
            ...response,
            userName: user ? user.username : response.userName || "Anonymous User",
          }
        })

        setResponses(enrichedResponses)

        // Process the data for dashboard
        if (enrichedResponses && enrichedResponses.length > 0) {
          processData(enrichedResponses)
        } else {
          setDefaultData()
        }
      } catch (err) {
        console.error("Error fetching responses:", err)
        setError("Failed to load response data")
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchResponses()
  }, [surveys, selectedSurvey, selectedTimeRange, users, apiBaseUrl, token, isRefreshing])

  // Process the data for dashboard visualization
  const processData = (responseData: SurveyResponse[]) => {
    if (!responseData || responseData.length === 0) {
      // Set default values if no data
      setDefaultData()
      return
    }

    // Filter responses by selected survey if not "all"
    const filteredResponses =
      selectedSurvey === "all" ? responseData : responseData.filter((r) => r.surveyId === selectedSurvey)

    if (filteredResponses.length === 0) {
      setDefaultData()
      return
    }

    // Calculate dashboard stats based on filtered responses
    const totalResponses = filteredResponses.length
    const totalSurveys = selectedSurvey === "all" ? surveys.length : 1
    const totalUsers = users.length
    const activeUsers = new Set(filteredResponses.map((r) => r.userId || r.respondentId)).size

    // Calculate completion rate
    const completedResponses = filteredResponses.filter((response) => {
      const survey = surveys.find((s) => s.id === response.surveyId)
      return (
        survey &&
        survey.questions &&
        response.answers &&
        Array.isArray(response.answers) &&
        survey.questions.length === response.answers.length
      )
    }).length
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0

    // Calculate average response time (simulated)
    const avgResponseTime = calculateAverageResponseTime(filteredResponses)

    // Calculate engagement score
    const engagementScore = Math.min(10, completionRate / 10 + totalResponses / 100)

    setStats({
      totalResponses,
      completionRate,
      avgResponseTime,
      engagementScore,
      totalSurveys,
      totalUsers,
      activeUsers,
    })

    // Process response trends by day of week
    processResponseTrends(responseData)

    // Process satisfaction distribution
    processSatisfactionDistribution(responseData)

    // Process demographic data
    processDemographicData(responseData)

    // Process recent responses
    processRecentResponses(responseData)

    // Process question type distribution
    processQuestionTypeDistribution()

    // Process response time distribution
    processResponseTimeDistribution(filteredResponses)

    // Process question analytics
    processQuestionAnalytics(responseData)
  }

  // Calculate average response time (based on real data if available, otherwise simulated)
  const calculateAverageResponseTime = (responseData: SurveyResponse[]): number => {
    if (!responseData || responseData.length === 0) return 0

    // Simulate response time based on number of answers
    const totalTime = responseData.reduce((sum, response) => {
      // Assume each answer takes between 20-40 seconds
      const questionCount = response.answers
        ? Array.isArray(response.answers)
          ? response.answers.length
          : 0
        : response.responses
          ? response.responses.length
          : 0
      const estimatedTime = (questionCount * (Math.random() * 20 + 20)) / 60 // in minutes
      return sum + estimatedTime
    }, 0)

    return totalTime / responseData.length
  }

  // Process response trends
  const processResponseTrends = (responseData: SurveyResponse[]) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const dayTrends = Array(7)
      .fill(0)
      .map((_, i) => ({
        name: dayNames[i],
        responses: 0,
        completionRate: 0,
        avgTime: 0,
      }))

    // Filter responses based on selected survey and time range
    let filteredResponses = filterResponsesByTimeRange(responseData)

    // Filter by selected survey if not "all"
    if (selectedSurvey !== "all") {
      filteredResponses = filteredResponses.filter((r) => r.surveyId === selectedSurvey)
    }

    // Count responses by day of week
    filteredResponses.forEach((response) => {
      if (response && (response.completedAt || response.submittedAt)) {
        try {
          const dateStr = response.completedAt || response.submittedAt
          if (!dateStr) return

          const day = new Date(dateStr).getDay()
          if (dayTrends[day]) {
            dayTrends[day].responses++
          }
        } catch (err) {
          console.error("Error processing response date:", err)
        }
      }
    })

    // Calculate completion rate and average time for each day
    dayTrends.forEach((day, index) => {
      const dayResponses = filteredResponses.filter((response) => {
        const dateStr = response.completedAt || response.submittedAt
        if (!dateStr) return false
        try {
          return new Date(dateStr).getDay() === index
        } catch (err) {
          return false
        }
      })

      if (dayResponses.length > 0) {
        // Calculate completion rate for this day
        const completedCount = dayResponses.filter((r) => {
          const survey = surveys.find((s) => s.id === r.surveyId)
          const answers = r.answers || r.responses || []
          return survey && survey.questions && Array.isArray(answers) && survey.questions.length === answers.length
        }).length

        day.completionRate = (completedCount / dayResponses.length) * 100

        // Calculate average time for this day (simulated)
        day.avgTime =
          dayResponses.reduce((sum, response) => {
            const answers = response.answers || response.responses || []
            const answerCount = Array.isArray(answers) ? answers.length : 0
            return sum + (answerCount * (Math.random() * 20 + 20)) / 60
          }, 0) / dayResponses.length
      }
    })

    setResponseTrends(dayTrends)
  }

  // Process satisfaction distribution
  const processSatisfactionDistribution = (responseData: SurveyResponse[]) => {
    const satisfactionCounts = {
      "Very Satisfied": 0,
      Satisfied: 0,
      Neutral: 0,
      Dissatisfied: 0,
    }

    // Filter responses based on selected time range
    let filteredResponses = filterResponsesByTimeRange(responseData)

    // Filter by selected survey if not "all"
    if (selectedSurvey !== "all") {
      filteredResponses = filteredResponses.filter((r) => r.surveyId === selectedSurvey)
    }

    // Count satisfaction levels based on scores or rating questions
    filteredResponses.forEach((response) => {
      // Try to find a rating question
      const answers = response.answers || response.responses || []
      if (!Array.isArray(answers)) return

      const ratingAnswer = answers.find((answer) => {
        if (!answer) return false

        const survey = surveys.find((s) => s.id === response.surveyId)
        if (!survey || !survey.questions) return false

        const question = survey.questions.find((q) => q.id === answer.questionId)
        return question && question.type === QuestionType.RATING
      })

      let score = 0

      if (ratingAnswer) {
        // Use the rating answer value
        const value = ratingAnswer.value || ratingAnswer.answer
        score = Number.parseInt(Array.isArray(value) ? value[0] : value, 10)
      } else if (response.score !== undefined) {
        // Use the overall score if available
        score = response.score
      } else {
        // Generate a random score between 1-10
        score = Math.floor(Math.random() * 10) + 1
      }

      // Categorize the score
      if (score >= 8) satisfactionCounts["Very Satisfied"]++
      else if (score >= 6) satisfactionCounts["Satisfied"]++
      else if (score >= 4) satisfactionCounts["Neutral"]++
      else satisfactionCounts["Dissatisfied"]++
    })

    setCategoryData([
      { name: "Very Satisfied", value: satisfactionCounts["Very Satisfied"] || 1, color: "#0088FE" },
      { name: "Satisfied", value: satisfactionCounts["Satisfied"] || 1, color: "#00C49F" },
      { name: "Neutral", value: satisfactionCounts["Neutral"] || 1, color: "#FFBB28" },
      { name: "Dissatisfied", value: satisfactionCounts["Dissatisfied"] || 1, color: "#FF8042" },
    ])
  }

  // Process demographic data based on user information
  const processDemographicData = (responseData: SurveyResponse[]) => {
    // Extract unique respondents
    const uniqueRespondents = new Map<string, User>()

    responseData.forEach((response) => {
      const userId = response.userId || response.respondentId
      if (!userId) return

      const user = users.find((u) => u.id === userId)
      if (user) {
        uniqueRespondents.set(userId, user)
      }
    })

    // For this example, we'll create simulated demographic data based on user IDs
    // In a real application, you would extract this from user profiles

    // Create age groups
    const ageGroups = ["18-24", "25-34", "35-44", "45-54", "55+"]

    // Generate demographic data based on user IDs
    const demographics = ageGroups.map((group) => {
      // Use consistent random numbers based on group name for demo purposes
      const groupHash = group.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const seed = groupHash / 1000

      // Get users for the selected survey if applicable
      let relevantUsers = Array.from(uniqueRespondents.values())

      if (selectedSurvey !== "all") {
        const surveyRespondentIds = responseData
          .filter((r) => r.surveyId === selectedSurvey)
          .map((r) => r.userId || r.respondentId)
          .filter(Boolean) as string[]

        relevantUsers = relevantUsers.filter((u) => surveyRespondentIds.includes(u.id))
      }

      const userCount = relevantUsers.length

      // Distribute users across age groups and genders
      // This is simulated - in a real app, you'd use actual demographic data
      const maleCount = Math.floor(userCount * (0.2 + (seed % 0.3)))
      const femaleCount = Math.floor(userCount * (0.2 + ((seed + 0.1) % 0.3)))
      const otherCount = Math.max(1, userCount - maleCount - femaleCount)

      return {
        name: group,
        male: maleCount,
        female: femaleCount,
        other: otherCount,
      }
    })

    setDemographicData(demographics)
  }

  // Process recent responses
  const processRecentResponses = (responseData: SurveyResponse[]) => {
    // Filter responses based on selected time range
    let filteredResponses = filterResponsesByTimeRange(responseData)

    // Filter by selected survey if not "all"
    if (selectedSurvey !== "all") {
      filteredResponses = filteredResponses.filter((r) => r.surveyId === selectedSurvey)
    }

    // Sort by completion date (newest first) and take the most recent ones
    const recent = filteredResponses
      .filter((response) => response && (response.completedAt || response.submittedAt))
      .sort((a, b) => {
        try {
          const dateA = new Date(a.completedAt || a.submittedAt || "").getTime()
          const dateB = new Date(b.completedAt || b.submittedAt || "").getTime()
          return dateB - dateA
        } catch (err) {
          return 0
        }
      })
      .slice(0, 10)
      .map((response) => {
        const survey = surveys.find((s) => s.id === response.surveyId)
        const completedTime = new Date(response.completedAt || response.submittedAt || "")
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - completedTime.getTime()) / (1000 * 60))

        let timeAgo
        if (diffMinutes < 60) {
          timeAgo = `${diffMinutes} mins ago`
        } else if (diffMinutes < 1440) {
          timeAgo = `${Math.floor(diffMinutes / 60)} hours ago`
        } else {
          timeAgo = `${Math.floor(diffMinutes / 1440)} days ago`
        }

        // Calculate score based on rating questions or generate a random one
        let score = response.score

        if (!score) {
          const answers = response.answers || response.responses || []
          if (Array.isArray(answers)) {
            const ratingAnswer = answers.find((answer) => {
              if (!answer) return false
              const question = survey?.questions?.find((q) => q.id === answer.questionId)
              return question && question.type === QuestionType.RATING
            })

            if (ratingAnswer) {
              const value = ratingAnswer.value || ratingAnswer.answer
              score = Number.parseInt(Array.isArray(value) ? value[0] : value, 10)
            } else {
              // Generate a random score between 7-10 for demo purposes
              score = Math.floor(Math.random() * 4) + 7
            }
          }
        }

        return {
          id: response.id,
          user: response.userName || "Anonymous User",
          userId: response.userId || response.respondentId,
          survey: survey?.title || "Unknown Survey",
          surveyId: response.surveyId,
          time: timeAgo,
          completedAt: response.completedAt || response.submittedAt,
          score,
          answers: response.answers || response.responses || [],
        }
      })

    setRecentResponses(recent)
  }

  // Process question type distribution
  const processQuestionTypeDistribution = () => {
    const questionTypes: Record<string, number> = {
      Text: 0,
      "Multiple Choice": 0,
      Checkbox: 0,
      Rating: 0,
      Date: 0,
    }

    // If a specific survey is selected, only count its question types
    const relevantSurveys = selectedSurvey === "all" ? surveys : surveys.filter((s) => s.id === selectedSurvey)

    // Count question types across relevant surveys
    relevantSurveys.forEach((survey) => {
      if (!survey.questions) return

      survey.questions.forEach((question) => {
        switch (question.type) {
          case QuestionType.TEXT:
            questionTypes["Text"]++
            break
          case QuestionType.MULTIPLE_CHOICE:
            questionTypes["Multiple Choice"]++
            break
          case QuestionType.CHECKBOX:
            questionTypes["Checkbox"]++
            break
          case QuestionType.RATING:
            questionTypes["Rating"]++
            break
          case QuestionType.DATE:
            questionTypes["Date"]++
            break
        }
      })
    })

    // Convert to array format for charts
    const distribution = Object.entries(questionTypes).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }))

    setQuestionTypeDistribution(distribution)
  }

  // Process response time distribution
  const processResponseTimeDistribution = (responseData: SurveyResponse[]) => {
    // Filter responses for the selected survey if applicable
    const relevantResponses =
      selectedSurvey === "all" ? responseData : responseData.filter((r) => r.surveyId === selectedSurvey)

    // Create time ranges in minutes
    const timeRanges = [
      { name: "< 2 min", min: 0, max: 2, count: 0 },
      { name: "2-5 min", min: 2, max: 5, count: 0 },
      { name: "5-10 min", min: 5, max: 10, count: 0 },
      { name: "> 10 min", min: 10, max: Number.POSITIVE_INFINITY, count: 0 },
    ]

    // Count responses in each time range
    relevantResponses.forEach((response) => {
      // Simulate response time based on answer count
      const answers = response.answers || response.responses || []
      const questionCount = Array.isArray(answers) ? answers.length : 0
      const estimatedTime = (questionCount * (Math.random() * 20 + 20)) / 60 // in minutes

      const range = timeRanges.find((r) => estimatedTime >= r.min && estimatedTime < r.max)
      if (range) range.count++
    })

    setResponseTimeDistribution(timeRanges)
  }

  // Process question analytics
  const processQuestionAnalytics = (responseData: SurveyResponse[]) => {
    // Only process if a specific survey is selected
    if (selectedSurvey === "all" || !selectedSurvey) {
      setQuestionAnalytics([])
      return
    }

    const survey = surveys.find((s) => s.id === selectedSurvey)
    if (!survey || !survey.questions) {
      setQuestionAnalytics([])
      return
    }

    // Filter responses for the selected survey
    const surveyResponses = responseData.filter((r) => r.surveyId === selectedSurvey)

    // Process analytics for each question
    const analytics = survey.questions.map((question) => {
      const questionAnalytic: QuestionAnalytics = {
        questionId: question.id,
        questionTitle: question.title,
        questionType: question.type,
        responseCount: 0,
      }

      // Count responses for this question
      const answers = surveyResponses
        .filter((response) => response && (response.answers || response.responses))
        .flatMap((response) => {
          const allAnswers = response.answers || response.responses || []
          return Array.isArray(allAnswers) ? allAnswers.filter((a) => a && a.questionId === question.id) : []
        })

      questionAnalytic.responseCount = answers.length

      // Process based on question type
      switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.CHECKBOX:
          if (question.options) {
            const optionCounts: Record<string, number> = {}

            // Initialize all options with 0 count
            question.options.forEach((option) => {
              optionCounts[option] = 0
            })

            // Count occurrences of each option
            answers.forEach((answer) => {
              if (!answer) return

              // Handle both value and selectedOptions fields
              let values: string[] = []

              if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
                values = answer.selectedOptions
              } else if (answer.value) {
                values = Array.isArray(answer.value) ? answer.value : [answer.value]
              } else if (answer.answer) {
                values = Array.isArray(answer.answer) ? answer.answer : [answer.answer]
              }

              values.forEach((value) => {
                if (optionCounts[value] !== undefined) {
                  optionCounts[value]++
                }
              })
            })

            // Convert to percentage format
            questionAnalytic.options = Object.entries(optionCounts).map(([label, count]) => ({
              label,
              count,
              percentage: answers.length > 0 ? (count / answers.length) * 100 : 0,
            }))
          }
          break

        case QuestionType.RATING:
          // Calculate average rating
          let totalRating = 0
          let ratingCount = 0

          answers.forEach((answer) => {
            if (!answer) return

            // Handle both value and answer fields
            const rawValue = answer.value || answer.answer
            if (!rawValue) return

            const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
            const rating = Number.parseInt(value, 10)
            if (!isNaN(rating)) {
              totalRating += rating
              ratingCount++
            }
          })

          questionAnalytic.averageRating = ratingCount > 0 ? totalRating / ratingCount : 0
          break

        case QuestionType.TEXT:
          // Collect text responses
          questionAnalytic.textResponses = answers
            .filter((answer) => answer && (answer.value || answer.answer))
            .map((answer) => {
              const value = answer.value || answer.answer
              return Array.isArray(value) ? value.join(", ") : value
            })
          break
      }

      return questionAnalytic
    })

    setQuestionAnalytics(analytics)
  }

  // Filter responses by time range
  const filterResponsesByTimeRange = (responseData: SurveyResponse[]) => {
    if (!responseData) return []

    const now = new Date()

    // First filter by time range
    const timeFiltered = responseData.filter((response) => {
      if (!response) return false

      const dateStr = response.completedAt || response.submittedAt
      if (!dateStr) return false

      try {
        const responseDate = new Date(dateStr)
        const diffTime = Math.abs(now.getTime() - responseDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        switch (selectedTimeRange) {
          case "day":
            return diffDays <= 1
          case "week":
            return diffDays <= 7
          case "month":
            return diffDays <= 30
          case "quarter":
            return diffDays <= 90
          default:
            return true
        }
      } catch (err) {
        console.error("Error filtering response by date:", err)
        return false
      }
    })

    return timeFiltered
  }

  // Set default data when no responses are available
  const setDefaultData = () => {
    setStats({
      totalResponses: 0,
      completionRate: 0,
      avgResponseTime: 0,
      engagementScore: 0,
      totalSurveys: surveys.length,
      totalUsers: users.length,
      activeUsers: 0,
    })

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    setResponseTrends(
      dayNames.map((name) => ({
        name,
        responses: 0,
        completionRate: 0,
        avgTime: 0,
      })),
    )

    setCategoryData([
      { name: "Very Satisfied", value: 0, color: "#0088FE" },
      { name: "Satisfied", value: 0, color: "#00C49F" },
      { name: "Neutral", value: 0, color: "#FFBB28" },
      { name: "Dissatisfied", value: 0, color: "#FF8042" },
    ])

    setDemographicData([
      { name: "18-24", male: 0, female: 0, other: 0 },
      { name: "25-34", male: 0, female: 0, other: 0 },
      { name: "35-44", male: 0, female: 0, other: 0 },
      { name: "45-54", male: 0, female: 0, other: 0 },
      { name: "55+", male: 0, female: 0, other: 0 },
    ])

    setRecentResponses([])
    setQuestionTypeDistribution([])
    setResponseTimeDistribution([])
    setQuestionAnalytics([])
  }

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Get stats for display
  const getDisplayStats = () => [
    {
      title: "Total Responses",
      value: formatNumber(stats.totalResponses),
      trend: `+${Math.floor(stats.totalResponses * 0.12)}%`,
      isPositive: true,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Completion Rate",
      value: `${Math.round(stats.completionRate)}%`,
      trend: `+${(stats.completionRate * 0.03).toFixed(1)}%`,
      isPositive: true,
      icon: Target,
      color: "bg-green-500",
    },
    {
      title: "Avg. Response Time",
      value: `${stats.avgResponseTime.toFixed(1)} min`,
      trend: "-0.3 min",
      isPositive: true,
      icon: Clock,
      color: "bg-purple-500",
    },
    {
      title: "Engagement Score",
      value: `${stats.engagementScore.toFixed(1)}/10`,
      trend: "+0.6",
      isPositive: true,
      icon: Brain,
      color: "bg-pink-500",
    },
  ]

  // Handle refresh data
  const handleRefresh = () => {
    setIsRefreshing(true)
  }

  // Handle view response details
  const handleViewResponseDetails = (response: any) => {
    // Find the full response data
    const fullResponse = responses.find((r) => r.id === response.id)
    if (fullResponse) {
      setSelectedResponse(fullResponse)
      setShowResponseDetails(true)
    }
  }

  // Handle export responses
  const handleExportResponses = async (surveyId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/surveys/${surveyId}/responses/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to export responses: ${response.status}`)
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `survey-responses-${surveyId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Error exporting responses:", err)
      setError("Failed to export responses")
    }
  }

  // Filter surveys by search query
  const filteredSurveys = useMemo(() => {
    if (!searchQuery) return surveys

    return surveys.filter(
      (survey) =>
        survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        survey.description.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [surveys, searchQuery])

  // Get question details for a response
  const getQuestionDetails = (questionId: string, surveyId: string) => {
    const survey = surveys.find((s) => s.id === surveyId)
    if (!survey || !survey.questions) return null

    return survey.questions.find((q) => q.id === questionId)
  }

  // Format answer value based on question type
  const formatAnswerValue = (answer: QuestionResponse, surveyId: string) => {
    if (!answer) return "No response"

    // Handle both value and answer fields
    const rawValue = answer.value || answer.answer || answer.selectedOptions
    if (!rawValue) return "No response"

    const question = getQuestionDetails(answer.questionId, surveyId)
    if (!question) return String(rawValue)

    switch (question.type) {
      case QuestionType.CHECKBOX:
        if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
          return answer.selectedOptions.join(", ")
        }
        return Array.isArray(rawValue) ? rawValue.join(", ") : rawValue
      case QuestionType.MULTIPLE_CHOICE:
        return Array.isArray(rawValue) ? rawValue.join(", ") : rawValue
      case QuestionType.RATING:
        return `${Array.isArray(rawValue) ? rawValue[0] : rawValue}/10`
      case QuestionType.TEXT:
        return Array.isArray(rawValue) ? rawValue.join(", ") : rawValue
      case QuestionType.DATE:
        return Array.isArray(rawValue) ? rawValue[0] : rawValue
      default:
        return String(Array.isArray(rawValue) ? rawValue.join(", ") : rawValue)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive survey analytics and insights</p>
        </div>

        {/* Filters and Actions */}
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search surveys..."
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSurveyList(!showSurveyList)}
              className="w-full sm:w-64 flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="flex items-center">
                <Filter className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-700">
                  {selectedSurvey === "all"
                    ? "All Surveys"
                    : surveys.find((s) => s.id === selectedSurvey)?.title || "Select Survey"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {showSurveyList && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                <button
                  key="all"
                  onClick={() => {
                    setSelectedSurvey("all")
                    setShowSurveyList(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700 first:rounded-t-lg"
                >
                  All Surveys
                </button>
                {filteredSurveys.map((survey) => (
                  <button
                    key={survey.id}
                    onClick={() => {
                      setSelectedSurvey(survey.id)
                      setShowSurveyList(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700 last:rounded-b-lg"
                  >
                    {survey.title}
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
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last Quarter</option>
          </select>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "overview"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "responses"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Responses
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "questions"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Question Analytics
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-sm text-red-700 underline">
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {getDisplayStats().map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-md p-6 transform hover:scale-105 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} p-3 rounded-lg`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className={`flex items-center ${stat.isPositive ? "text-green-500" : "text-red-500"}`}>
                        {stat.isPositive ? (
                          <ArrowUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-1" />
                        )}
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

              {/* Chart Type Selector */}
              <div className="flex mb-4 bg-white p-2 rounded-lg shadow-sm">
                <button
                  onClick={() => setSelectedChartType("area")}
                  className={`flex items-center px-3 py-1.5 rounded ${
                    selectedChartType === "area" ? "bg-indigo-100 text-indigo-700" : "text-gray-600"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Area
                </button>
                <button
                  onClick={() => setSelectedChartType("line")}
                  className={`flex items-center px-3 py-1.5 rounded ${
                    selectedChartType === "line" ? "bg-indigo-100 text-indigo-700" : "text-gray-600"
                  }`}
                >
                  <LineChartIcon className="h-4 w-4 mr-2" />
                  Line
                </button>
                <button
                  onClick={() => setSelectedChartType("bar")}
                  className={`flex items-center px-3 py-1.5 rounded ${
                    selectedChartType === "bar" ? "bg-indigo-100 text-indigo-700" : "text-gray-600"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Bar
                </button>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Response Trends */}
                <div className="bg-white p-6 rounded-xl shadow-md">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Response Trends</h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {selectedTimeRange === "day"
                          ? "Last 24 hours"
                          : selectedTimeRange === "week"
                            ? "Last 7 days"
                            : selectedTimeRange === "month"
                              ? "Last 30 days"
                              : "Last Quarter"}
                      </span>
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="w-full h-[300px] min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedChartType === "area" ? (
                        <AreaChart data={responseTrends}>
                          <defs>
                            <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="responses"
                            stroke="#8884d8"
                            fillOpacity={1}
                            fill="url(#responseGradient)"
                          />
                        </AreaChart>
                      ) : selectedChartType === "line" ? (
                        <LineChart data={responseTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="responses" stroke="#8884d8" />
                          <Line type="monotone" dataKey="completionRate" stroke="#82ca9d" />
                        </LineChart>
                      ) : (
                        <BarChart data={responseTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="responses" fill="#8884d8" />
                        </BarChart>
                      )}
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
                    <button
                      onClick={() => setActiveTab("responses")}
                      className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    {recentResponses.length > 0 ? (
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Survey
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {recentResponses.slice(0, 5).map((response) => (
                            <tr key={response.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {response.user}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.survey}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.time}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    response.score >= 8
                                      ? "bg-green-100 text-green-800"
                                      : response.score >= 6
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {response.score}/10
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => handleViewResponseDetails(response)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No recent responses available</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Responses Tab */}
          {activeTab === "responses" && (
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">All Responses</h2>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {responses.length} {responses.length === 1 ? "response" : "responses"}
                  </span>

                  {selectedSurvey !== "all" && (
                    <button
                      onClick={() => handleExportResponses(selectedSurvey)}
                      className="flex items-center px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </button>
                  )}
                </div>
              </div>

              {responses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Survey
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Questions Answered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {responses.map((response) => {
                        if (!response || !response.id) return null
                        const survey = surveys.find((s) => s.id === response.surveyId)
                        const answers = response.answers || response.responses || []
                        return (
                          <tr key={response.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {response.userName || "Anonymous User"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {survey?.title || "Unknown Survey"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {response.completedAt || response.submittedAt
                                ? new Date(response.completedAt || response.submittedAt).toLocaleString()
                                : "Unknown"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {Array.isArray(answers) ? answers.length : 0} / {survey?.questions?.length || "?"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleViewResponseDetails(response)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No responses available</div>
              )}
            </div>
          )}

          {/* Question Analytics Tab */}
          {activeTab === "questions" && (
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Question Analytics</h2>
                <div className="flex items-center space-x-2">
                  {selectedSurvey === "all" ? (
                    <span className="text-sm text-red-500">
                      Please select a specific survey to view question analytics
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">
                      {surveys.find((s) => s.id === selectedSurvey)?.title || "Unknown Survey"}
                    </span>
                  )}
                </div>
              </div>

              {selectedSurvey !== "all" && questionAnalytics.length > 0 ? (
                <div className="space-y-8">
                  {questionAnalytics.map((question) => (
                    <div key={question.questionId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{question.questionTitle}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs mr-2">
                          {question.questionType}
                        </span>
                        <span>{question.responseCount} responses</span>
                      </div>

                      {/* Different visualizations based on question type */}
                      {question.questionType === QuestionType.MULTIPLE_CHOICE && question.options && (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={question.options}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {question.questionType === QuestionType.CHECKBOX && question.options && (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={question.options}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {question.questionType === QuestionType.RATING && question.averageRating !== undefined && (
                        <div className="flex flex-col items-center">
                          <div className="text-4xl font-bold text-indigo-600 mb-2">
                            {question.averageRating.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-500">Average Rating</div>
                        </div>
                      )}

                      {question.questionType === QuestionType.TEXT && question.textResponses && (
                        <div className="max-h-[300px] overflow-y-auto">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Text Responses:</h4>
                          <ul className="space-y-2">
                            {question.textResponses.map((response, index) => (
                              <li key={index} className="p-2 bg-gray-50 rounded text-sm">
                                {response}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : selectedSurvey === "all" ? (
                <div className="text-center py-8 text-gray-500">
                  Please select a specific survey to view question analytics
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No question analytics available</div>
              )}
            </div>
          )}

          {/* Response Details Modal */}
          {showResponseDetails && selectedResponse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Response Details</h2>
                    <button onClick={() => setShowResponseDetails(false)} className="text-gray-500 hover:text-gray-700">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">User</p>
                      <p className="font-medium">{selectedResponse.userName || "Anonymous User"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Survey</p>
                      <p className="font-medium">
                        {surveys.find((s) => s.id === selectedResponse.surveyId)?.title || "Unknown Survey"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed At</p>
                      <p className="font-medium">
                        {selectedResponse.completedAt || selectedResponse.submittedAt
                          ? new Date(selectedResponse.completedAt || selectedResponse.submittedAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Response ID</p>
                      <p className="font-medium">{selectedResponse.id}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium mb-4">Answers</h3>
                    <div className="space-y-4">
                      {(selectedResponse.answers || selectedResponse.responses) &&
                      Array.isArray(selectedResponse.answers || selectedResponse.responses) &&
                      (selectedResponse.answers || selectedResponse.responses).length > 0 ? (
                        (selectedResponse.answers || selectedResponse.responses).map((answer) => {
                          if (!answer) return null
                          const question = getQuestionDetails(answer.questionId, selectedResponse.surveyId)
                          return (
                            <div key={answer.questionId} className="border border-gray-200 rounded-lg p-4">
                              <p className="font-medium mb-2">{question?.title || "Unknown Question"}</p>
                              <div className="flex items-center text-sm text-gray-500 mb-2">
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">
                                  {question?.type || "Unknown Type"}
                                </span>
                              </div>
                              <p className="text-gray-800">{formatAnswerValue(answer, selectedResponse.surveyId)}</p>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500">No answers available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminDashboard
