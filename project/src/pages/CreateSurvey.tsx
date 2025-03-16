"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Trash2,
  AlignLeft,
  List,
  CircleDot,
  GripVertical,
  Copy,
  Settings,
  Eye,
  Save,
  Loader2,
} from "lucide-react"
import axios from "axios"

// Define question types that match the API's numeric types
// Based on the API response:
// 0 = likert_scale
// 1 = multiple_choice
// 2 = open_ended
// 3 = checkbox
// 4 = linear_scale
type QuestionType =
  | "multiple_choice"
  | "likert_scale"
  | "open_ended"
  | "checkbox"
  | "linear_scale"
  | "date"
  | "time"
  | "closed_ended"

interface Question {
  id: string
  type: QuestionType
  question: string
  required: boolean
  description?: string
  options?: string[]
  likertScale?: {
    min: number
    max: number
    labels: string[]
  }
  linearScale?: {
    min: number
    max: number
    minLabel: string
    maxLabel: string
  }
}

// API interfaces based on the response format
interface ApiQuestion {
  title: string
  description: string
  type: number // API uses numeric types
  options: string[]
  isRequired: boolean
  imageUrl?: string | null
}

const API_BASE_URL = "/api"

// Map our question types to the API's numeric types
const questionTypeToApiType = (type: QuestionType): number => {
  switch (type) {
    case "likert_scale":
      return 0
    case "multiple_choice":
      return 1
    case "open_ended":
      return 2
    case "checkbox":
      return 3
    case "linear_scale":
      return 4
    case "date":
      return 5 // Assuming these are additional types
    case "time":
      return 6 // Assuming these are additional types
    case "closed_ended":
      return 7 // New type for closed-ended questions
    default:
      return 1
  }
}

const CreateSurvey = () => {
  const navigate = useNavigate()
  const [survey, setSurvey] = useState({
    title: "",
    description: "",
    category: "",
    settings: {
      requireSignIn: false,
      shuffleQuestions: false,
      showProgressBar: true,
      allowReview: true,
    },
    questions: [] as Question[],
  })

  const [previewMode, setPreviewMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [coverImage, setCoverImage] = useState<File | null>(null)

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const user = localStorage.getItem("user")

    if (token && user) {
      try {
        // Check if user has admin role or admin in email
        const userData = JSON.parse(user)
        if (
          userData.roles?.includes("Admin") ||
          userData.roles?.includes("admin") ||
          userData.email?.includes("admin")
        ) {
          setIsAuthenticated(true)
        } else {
          setSubmitError("You need admin privileges to create surveys")
        }
      } catch (e) {
        setSubmitError("Invalid user data. Please log in again.")
      }
    } else {
      setSubmitError("You need to be logged in as an admin to create surveys")
    }
  }, [])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: generateId(),
      type,
      question: "",
      required: false,
      description: "",
      ...(type === "multiple_choice" && { options: [""] }),
      ...(type === "checkbox" && { options: [""] }),
      ...(type === "likert_scale" && {
        likertScale: {
          min: 1,
          max: 5,
          labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
        },
      }),
      ...(type === "linear_scale" && {
        linearScale: {
          min: 0,
          max: 10,
          minLabel: "Not at all likely",
          maxLabel: "Extremely likely",
        },
      }),
    }

    setSurvey({
      ...survey,
      questions: [...survey.questions, newQuestion],
    })
  }

  const duplicateQuestion = (questionIndex: number) => {
    const questionToDuplicate = survey.questions[questionIndex]
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: generateId(),
      question: `${questionToDuplicate.question} (Copy)`,
    }
    const newQuestions = [...survey.questions]
    newQuestions.splice(questionIndex + 1, 0, duplicatedQuestion)
    setSurvey({ ...survey, questions: newQuestions })
  }

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...survey.questions]
    const [movedQuestion] = newQuestions.splice(fromIndex, 1)
    newQuestions.splice(toIndex, 0, movedQuestion)
    setSurvey({ ...survey, questions: newQuestions })
  }

  const removeQuestion = (index: number) => {
    const newQuestions = survey.questions.filter((_, i) => i !== index)
    setSurvey({ ...survey, questions: newQuestions })
  }

  const addOption = (questionIndex: number) => {
    const newQuestions = [...survey.questions]
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options?.push("")
      setSurvey({ ...survey, questions: newQuestions })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0])
    }
  }

  // Convert our survey format to the API format
// Convert our survey format to the API format
const convertToApiFormat = () => {
  // Convert questions to API format
  const apiQuestions: ApiQuestion[] = survey.questions.map((q) => {
    let options: string[] = []

    // Handle different question types
    if (q.type === "multiple_choice" || q.type === "checkbox") {
      options = q.options || []
    } else if (q.type === "likert_scale" && q.likertScale) {
      // For likert scale, use the labels instead of numeric values
      options = q.likertScale.labels
    } else if (q.type === "linear_scale" && q.linearScale) {
      // For linear scale, create options from min to max
      options = []
      for (let i = q.linearScale.min; i <= q.linearScale.max; i++) {
        options.push(i.toString())
      }
    }

    return {
      title: q.question,
      description: q.description || "",
      type: questionTypeToApiType(q.type),
      options: options,
      isRequired: q.required,
    }
  })

  return apiQuestions
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setSubmitError("You need to be logged in as an admin to create surveys")
      return
    }

    if (!survey.title) {
      setSubmitError("Survey title is required")
      return
    }

    if (survey.questions.length === 0) {
      setSubmitError("At least one question is required")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const apiQuestions = convertToApiFormat()

      // Get the authentication token
      const token = localStorage.getItem("auth_token")

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Create FormData for file upload support
      const formData = new FormData()
      formData.append("title", survey.title)
      formData.append("description", survey.description)
      formData.append("isActive", "true")

      // Convert questions array to JSON string
      formData.append("questionsJson", JSON.stringify(apiQuestions))

      // Add cover image if selected
      if (coverImage) {
        formData.append("coverImage", coverImage)
      }

      // Send the request to create a survey with the auth token
      const response = await axios.post(`${API_BASE_URL}/surveys`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("Survey created:", response.data)
      setSubmitSuccess(true)

      // Reset form after successful submission
      setSurvey({
        title: "",
        description: "",
        category: "",
        settings: {
          requireSignIn: false,
          shuffleQuestions: false,
          showProgressBar: true,
          allowReview: true,
        },
        questions: [],
      })
      setCoverImage(null)

      // Redirect to surveys list after a short delay
      setTimeout(() => {
        navigate("/surveys")
      }, 2000)
    } catch (error) {
      console.error("Error creating survey:", error)
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          setSubmitError("Unauthorized: Your session may have expired. Please log in again.")
        } else {
          setSubmitError(`Failed to create survey: ${error.response.data?.message || error.message}`)
        }
      } else {
        setSubmitError("Failed to create survey. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestionFields = (question: Question, index: number) => {
    const commonFields = (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <input
            type="text"
            placeholder="Enter your question"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            value={question.question}
            onChange={(e) => {
              const newQuestions = [...survey.questions]
              newQuestions[index].question = e.target.value
              setSurvey({ ...survey, questions: newQuestions })
            }}
          />
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => duplicateQuestion(index)}
              className="p-2 text-gray-600 hover:text-indigo-600"
              title="Duplicate question"
            >
              <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="p-2 text-gray-600 hover:text-red-600"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Add a description (optional)"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          value={question.description || ""}
          onChange={(e) => {
            const newQuestions = [...survey.questions]
            newQuestions[index].description = e.target.value
            setSurvey({ ...survey, questions: newQuestions })
          }}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`required-${question.id}`}
            checked={question.required}
            onChange={(e) => {
              const newQuestions = [...survey.questions]
              newQuestions[index].required = e.target.checked
              setSurvey({ ...survey, questions: newQuestions })
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor={`required-${question.id}`} className="text-sm text-gray-700">
            Required
          </label>
        </div>
      </div>
    )

    switch (question.type) {
      case "multiple_choice":
      case "checkbox":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="space-y-2">
              {question.options?.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  {question.type === "multiple_choice" ? (
                    <div className="h-4 w-4 rounded-full border border-gray-300" />
                  ) : (
                    <div className="h-4 w-4 rounded border border-gray-300" />
                  )}
                  <input
                    type="text"
                    placeholder={`Option ${optionIndex + 1}`}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={option}
                    onChange={(e) => {
                      const newQuestions = [...survey.questions]
                      if (newQuestions[index].options) {
                        newQuestions[index].options![optionIndex] = e.target.value
                        setSurvey({ ...survey, questions: newQuestions })
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newQuestions = [...survey.questions]
                      newQuestions[index].options = question.options?.filter((_, i) => i !== optionIndex)
                      setSurvey({ ...survey, questions: newQuestions })
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(index)}
                className="mt-2 inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </button>
            </div>
          </div>
        )

      case "likert_scale":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Value</label>
                  <input
                    type="number"
                    value={question.likertScale?.min}
                    onChange={(e) => {
                      const newQuestions = [...survey.questions]
                      if (newQuestions[index].likertScale) {
                        newQuestions[index].likertScale!.min = Number.parseInt(e.target.value)
                        setSurvey({ ...survey, questions: newQuestions })
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Maximum Value</label>
                  <input
                    type="number"
                    value={question.likertScale?.max}
                    onChange={(e) => {
                      const newQuestions = [...survey.questions]
                      if (newQuestions[index].likertScale) {
                        newQuestions[index].likertScale!.max = Number.parseInt(e.target.value)
                        setSurvey({ ...survey, questions: newQuestions })
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Scale Labels</label>
                <div className="mt-1 space-y-2">
                  {question.likertScale?.labels.map((label, labelIndex) => (
                    <input
                      key={labelIndex}
                      type="text"
                      value={label}
                      onChange={(e) => {
                        const newQuestions = [...survey.questions]
                        if (newQuestions[index].likertScale) {
                          newQuestions[index].likertScale!.labels[labelIndex] = e.target.value
                          setSurvey({ ...survey, questions: newQuestions })
                        }
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder={`Label ${labelIndex + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case "linear_scale":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Value</label>
                <input
                  type="number"
                  value={question.linearScale?.min}
                  onChange={(e) => {
                    const newQuestions = [...survey.questions]
                    if (newQuestions[index].linearScale) {
                      newQuestions[index].linearScale!.min = Number.parseInt(e.target.value)
                      setSurvey({ ...survey, questions: newQuestions })
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <input
                  type="text"
                  value={question.linearScale?.minLabel}
                  onChange={(e) => {
                    const newQuestions = [...survey.questions]
                    if (newQuestions[index].linearScale) {
                      newQuestions[index].linearScale!.minLabel = e.target.value
                      setSurvey({ ...survey, questions: newQuestions })
                    }
                  }}
                  placeholder="Minimum label"
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Value</label>
                <input
                  type="number"
                  value={question.linearScale?.max}
                  onChange={(e) => {
                    const newQuestions = [...survey.questions]
                    if (newQuestions[index].linearScale) {
                      newQuestions[index].linearScale!.max = Number.parseInt(e.target.value)
                      setSurvey({ ...survey, questions: newQuestions })
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <input
                  type="text"
                  value={question.linearScale?.maxLabel}
                  onChange={(e) => {
                    const newQuestions = [...survey.questions]
                    if (newQuestions[index].linearScale) {
                      newQuestions[index].linearScale!.maxLabel = e.target.value
                      setSurvey({ ...survey, questions: newQuestions })
                    }
                  }}
                  placeholder="Maximum label"
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )

      case "open_ended":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">
                Respondents will be provided with a text area to write their answer.
              </p>
            </div>
          </div>
        )
      case "closed_ended":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">
                Respondents will be provided with a short text field for a brief, specific answer.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Survey</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">{previewMode ? "Edit" : "Preview"}</span>
            </button>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700">
              You need to be logged in as an admin to create surveys.{" "}
              <a href="/login" className="underline">
                Log in now
              </a>
            </p>
          </div>
        )}

        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700">Survey created successfully! Redirecting to surveys list...</p>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {showSettings && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Survey Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="requireSignIn"
                    checked={survey.settings.requireSignIn}
                    onChange={(e) =>
                      setSurvey({
                        ...survey,
                        settings: { ...survey.settings, requireSignIn: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="requireSignIn" className="text-sm text-gray-700">
                    Require sign in to respond
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="shuffleQuestions"
                    checked={survey.settings.shuffleQuestions}
                    onChange={(e) =>
                      setSurvey({
                        ...survey,
                        settings: { ...survey.settings, shuffleQuestions: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="shuffleQuestions" className="text-sm text-gray-700">
                    Shuffle question order
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="showProgressBar"
                    checked={survey.settings.showProgressBar}
                    onChange={(e) =>
                      setSurvey({
                        ...survey,
                        settings: { ...survey.settings, showProgressBar: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="showProgressBar" className="text-sm text-gray-700">
                    Show progress bar
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="allowReview"
                    checked={survey.settings.allowReview}
                    onChange={(e) =>
                      setSurvey({
                        ...survey,
                        settings: { ...survey.settings, allowReview: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allowReview" className="text-sm text-gray-700">
                    Allow response review
                  </label>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Survey Title</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={survey.title}
              onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={3}
              value={survey.description}
              onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
            {coverImage && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">Selected: {coverImage.name}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={survey.category}
              onChange={(e) => setSurvey({ ...survey, category: e.target.value })}
              required
            >
              <option value="">Select a category</option>
              <option value="customer_feedback">Customer Feedback</option>
              <option value="employee_satisfaction">Employee Satisfaction</option>
              <option value="market_research">Market Research</option>
              <option value="product_development">Product Development</option>
              <option value="education">Education</option>
              <option value="event_feedback">Event Feedback</option>
              <option value="research">Research</option>
            </select>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => addQuestion("multiple_choice")}
                  className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion("checkbox")}
                  className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Checkbox
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion("likert_scale")}
                  className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <CircleDot className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Likert Scale
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion("linear_scale")}
                  className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <CircleDot className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Linear Scale
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion("open_ended")}
                  className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <AlignLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Open-Ended
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion("closed_ended")}
                  className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <AlignLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Closed-Ended
                </button>
              </div>
            </div>

            {survey.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-4">
                  <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                    {question.type
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </span>
                </div>
                {renderQuestionFields(question, questionIndex)}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 sm:pt-6">
            <button
              type="submit"
              disabled={isSubmitting || !isAuthenticated}
              className={`inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isSubmitting || !isAuthenticated ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Create Survey
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSurvey