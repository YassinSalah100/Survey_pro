"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Trash2,
  List,
  GripVertical,
  Copy,
  Settings,
  Eye,
  Save,
  Loader2,
  Calendar,
  Clock,
  CheckSquare,
  FileText,
  MessageSquare,
  BarChart4,
  Sparkles,
  ImageIcon,
  X,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import axios from "axios"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

// Update imports to include the API service
// Remove this line:
// import { surveyService } from "../services/api-service"

// Define question types that match the API’s numeric types
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

// Map our question types to the API’s numeric types
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
      return 5
    case "time":
      return 6
    case "closed_ended":
      return 7
    default:
      return 1
  }
}

// Question type display names and icons
const questionTypeInfo = {
  multiple_choice: { name: "Multiple Choice", icon: List },
  checkbox: { name: "Checkbox", icon: CheckSquare },
  likert_scale: { name: "Likert Scale", icon: BarChart4 },
  linear_scale: { name: "Linear Scale", icon: BarChart4 },
  open_ended: { name: "Open-Ended", icon: MessageSquare },
  closed_ended: { name: "Closed-Ended", icon: FileText },
  date: { name: "Date", icon: Calendar },
  time: { name: "Time", icon: Clock },
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
      theme: "default",
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
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null)
  const [showTips, setShowTips] = useState(true)
  const [showQuestionLibrary, setShowQuestionLibrary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const newQuestions = [...survey.questions, newQuestion]
    setSurvey({
      ...survey,
      questions: newQuestions,
    })

    // Set the newly added question as active
    setActiveQuestionIndex(newQuestions.length - 1)
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
    setActiveQuestionIndex(questionIndex + 1)
  }

  const removeQuestion = (index: number) => {
    const newQuestions = survey.questions.filter((_, i) => i !== index)
    setSurvey({ ...survey, questions: newQuestions })
    setActiveQuestionIndex(null)
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
      const file = e.target.files[0]
      setCoverImage(file)

      // Create a preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(survey.questions)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSurvey({ ...survey, questions: items })

    // Update active question index if it was moved
    if (activeQuestionIndex === result.source.index) {
      setActiveQuestionIndex(result.destination.index)
    }
  }

  // Convert our survey format to the API format
  const convertToApiFormat = () => {
    // Convert questions to API format
    const apiQuestions = survey.questions.map((q) => {
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

  // Update the handleSubmit function to use the API service
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
          theme: "default",
        },
        questions: [],
      })
      setCoverImage(null)
      setCoverImagePreview(null)

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
              className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
              title="Duplicate question"
            >
              <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
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
                    <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded border border-gray-300 flex-shrink-0" />
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
                      if (newQuestions[index].options && newQuestions[index].options!.length > 1) {
                        newQuestions[index].options = question.options?.filter((_, i) => i !== optionIndex)
                        setSurvey({ ...survey, questions: newQuestions })
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    disabled={question.options!.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(index)}
                className="mt-2 inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
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

            {/* Preview of scale */}
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500 mb-2">Preview:</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{question.linearScale?.minLabel}</span>
                <div className="flex-1 mx-4 flex justify-between">
                  {Array.from({ length: (question.linearScale?.max || 10) - (question.linearScale?.min || 0) + 1 }).map(
                    (_, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {(question.linearScale?.min || 0) + i}
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <span className="text-xs text-gray-600">{question.linearScale?.maxLabel}</span>
              </div>
            </div>
          </div>
        )

      case "open_ended":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600 mb-2">
                Respondents will be provided with a text area to write their answer.
              </p>
              <div className="border border-gray-300 rounded-md p-3 bg-white h-24 opacity-50"></div>
            </div>
          </div>
        )
      case "closed_ended":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600 mb-2">
                Respondents will be provided with a short text field for a brief, specific answer.
              </p>
              <div className="border border-gray-300 rounded-md p-3 bg-white h-10 opacity-50"></div>
            </div>
          </div>
        )
      case "date":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600 mb-2">Respondents will be provided with a date picker.</p>
              <div className="border border-gray-300 rounded-md p-3 bg-white h-10 opacity-50 flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-400 text-sm">Select a date</span>
              </div>
            </div>
          </div>
        )
      case "time":
        return (
          <div className="space-y-4">
            {commonFields}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600 mb-2">Respondents will be provided with a time picker.</p>
              <div className="border border-gray-300 rounded-md p-3 bg-white h-10 opacity-50 flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-400 text-sm">Select a time</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Template questions for the question library
  const questionTemplates = [
    {
      id: "template-1",
      type: "multiple_choice" as QuestionType,
      question: "How satisfied are you with our product?",
      required: true,
      description: "Please select the option that best describes your experience.",
      options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
    },
    {
      id: "template-2",
      type: "linear_scale" as QuestionType,
      question: "How likely are you to recommend our product to a friend?",
      required: true,
      description: "0 = Not likely at all, 10 = Extremely likely",
      linearScale: {
        min: 0,
        max: 10,
        minLabel: "Not likely at all",
        maxLabel: "Extremely likely",
      },
    },
    {
      id: "template-3",
      type: "open_ended" as QuestionType,
      question: "What improvements would you like to see in our product?",
      required: false,
      description: "Please share your thoughts and suggestions.",
    },
    {
      id: "template-4",
      type: "checkbox" as QuestionType,
      question: "Which features do you use most often?",
      required: false,
      description: "Select all that apply.",
      options: ["Feature A", "Feature B", "Feature C", "Feature D", "Feature E"],
    },
  ]

  const addTemplateQuestion = (template: Question) => {
    const newQuestion = {
      ...template,
      id: generateId(),
    }

    const newQuestions = [...survey.questions, newQuestion]
    setSurvey({
      ...survey,
      questions: newQuestions,
    })

    setActiveQuestionIndex(newQuestions.length - 1)
    setShowQuestionLibrary(false)
  }

  // Preview mode rendering
  const renderPreview = () => {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Survey header with cover image */}
        <div className="relative">
          {coverImagePreview ? (
            <div className="h-48 bg-gray-200 relative">
              <img
                src={coverImagePreview || "/placeholder.svg"}
                alt="Survey cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          )}

          <div className={`p-6 ${coverImagePreview ? "relative -mt-16 bg-white rounded-t-xl mx-4" : ""}`}>
            <h1 className="text-2xl font-bold text-gray-900">{survey.title || "Untitled Survey"}</h1>
            <p className="mt-2 text-gray-600">{survey.description || "No description provided."}</p>
          </div>
        </div>

        {/* Questions */}
        <div className="p-6 space-y-6">
          {survey.questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No questions added yet. Click the "Add Question" button to start building your survey.
              </p>
            </div>
          ) : (
            survey.questions.map((question, index) => (
              <div key={question.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full w-8 h-8 text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {question.question || "Untitled Question"}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {question.description && <p className="text-gray-600 text-sm mt-1">{question.description}</p>}
                  </div>
                </div>

                {/* Render different question types */}
                <div className="mt-4 pl-11">
                  {question.type === "multiple_choice" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, i) => (
                        <div key={i} className="flex items-center">
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3"></div>
                          <span>{option || `Option ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "checkbox" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, i) => (
                        <div key={i} className="flex items-center">
                          <div className="w-5 h-5 rounded border-2 border-gray-300 mr-3"></div>
                          <span>{option || `Option ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "open_ended" && (
                    <div className="border border-gray-300 rounded-md p-3 bg-white h-24"></div>
                  )}

                  {question.type === "closed_ended" && (
                    <div className="border border-gray-300 rounded-md p-3 bg-white h-10"></div>
                  )}

                  {question.type === "likert_scale" && question.likertScale && (
                    <div className="space-y-2">
                      {question.likertScale.labels.map((label, i) => (
                        <div key={i} className="flex items-center">
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3"></div>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "linear_scale" && question.linearScale && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{question.linearScale.minLabel}</span>
                        <div className="flex-1 mx-4 flex justify-between">
                          {Array.from({ length: question.linearScale.max - question.linearScale.min + 1 }).map(
                            (_, i) => (
                              <div key={i} className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                                  {question.linearScale.min + i}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        <span className="text-sm text-gray-600">{question.linearScale.maxLabel}</span>
                      </div>
                    </div>
                  )}

                  {question.type === "date" && (
                    <div className="border border-gray-300 rounded-md p-3 bg-white h-10 flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-400">Select a date</span>
                    </div>
                  )}

                  {question.type === "time" && (
                    <div className="border border-gray-300 rounded-md p-3 bg-white h-10 flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-400">Select a time</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Submit button */}
        <div className="p-6 border-t border-gray-200">
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-screen">
      <AnimatePresence>
        {showTips && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex">
                <HelpCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Tips for creating effective surveys</h3>
                  <ul className="mt-2 text-sm text-blue-700 list-disc pl-5 space-y-1">
                    <li>Keep questions clear and concise</li>
                    <li>Use a logical flow from general to specific questions</li>
                    <li>Include a mix of question types for better engagement</li>
                    <li>Preview your survey before publishing to check the user experience</li>
                  </ul>
                </div>
              </div>
              <button onClick={() => setShowTips(false)} className="text-blue-500 hover:text-blue-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className={`${previewMode ? "lg:w-1/2" : "w-full"} transition-all duration-300`}>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <Sparkles className="h-6 w-6 text-indigo-500 mr-2" />
                Create New Survey
              </h1>
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`inline-flex items-center px-3 sm:px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                    showSettings
                      ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                      : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Settings className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`inline-flex items-center px-3 sm:px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                    previewMode
                      ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                      : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{previewMode ? "Edit" : "Preview"}</span>
                </button>
              </div>
            </div>

            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md"
              >
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
                  <p className="text-yellow-700">
                    You need to be logged in as an admin to create surveys.{" "}
                    <a href="/login" className="font-medium underline hover:text-yellow-800">
                      Log in now
                    </a>
                  </p>
                </div>
              </motion.div>
            )}

            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-md"
              >
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                  <p className="text-green-700">Survey created successfully! Redirecting to surveys list...</p>
                </div>
              </motion.div>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md"
              >
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                  <p className="text-red-700">{submitError}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 text-indigo-500 mr-2" />
                    Survey Settings
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                    <div className="grid grid-cols-4 gap-3">
                      {["default", "modern", "minimal", "colorful"].map((theme) => (
                        <div
                          key={theme}
                          onClick={() => setSurvey({ ...survey, settings: { ...survey.settings, theme } })}
                          className={`cursor-pointer rounded-md p-2 border ${
                            survey.settings.theme === theme
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className={`h-8 rounded-md mb-1 ${
                              theme === "default"
                                ? "bg-indigo-500"
                                : theme === "modern"
                                  ? "bg-gray-800"
                                  : theme === "minimal"
                                    ? "bg-white border border-gray-300"
                                    : "bg-gradient-to-r from-pink-500 to-purple-500"
                            }`}
                          ></div>
                          <p className="text-xs text-center capitalize">{theme}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Survey Title</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={survey.title}
                    onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                    placeholder="Enter survey title"
                    required
                  />
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={3}
                  value={survey.description}
                  onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
                  placeholder="Provide a brief description of your survey"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cover Image</label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <ImageIcon className="h-5 w-5 mr-2 text-gray-500" />
                    {coverImage ? "Change Image" : "Upload Image"}
                  </button>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage(null)
                        setCoverImagePreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  )}
                </div>
                {coverImagePreview && (
                  <div className="mt-3 relative">
                    <img
                      src={coverImagePreview || "/placeholder.svg"}
                      alt="Cover preview"
                      className="h-32 w-full object-cover rounded-md"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <FileText className="h-5 w-5 text-indigo-500 mr-2" />
                    Questions
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({survey.questions.length} {survey.questions.length === 1 ? "question" : "questions"})
                    </span>
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuestionLibrary(!showQuestionLibrary)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Templates
                    </button>
                  </div>
                </div>

                {/* Question Library Modal */}
                <AnimatePresence>
                  {showQuestionLibrary && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="fixed inset-0 z-50 overflow-y-auto"
                    >
                      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                          &#8203;
                        </span>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                        >
                          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Question Templates</h3>
                                <div className="mt-2 space-y-4">
                                  {questionTemplates.map((template) => (
                                    <div
                                      key={template.id}
                                      className="p-4 border border-gray-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                                      onClick={() => addTemplateQuestion(template)}
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        {questionTypeInfo[template.type].icon &&
                                          React.createElement(questionTypeInfo[template.type].icon, {
                                            className: "h-4 w-4 text-indigo-500",
                                          })}
                                        <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                          {questionTypeInfo[template.type].name}
                                        </span>
                                      </div>
                                      <h4 className="font-medium text-gray-900">{template.question}</h4>
                                      {template.description && (
                                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                              type="button"
                              onClick={() => setShowQuestionLibrary(false)}
                              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                              Close
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(questionTypeInfo).map(([type, info]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type as QuestionType)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                      {info.icon && <info.icon className="h-4 w-4 mr-1.5" />}
                      {info.name}
                    </button>
                  ))}
                </div>

                <DragDropContext
                  onDragEnd={(result) => {
                    if (!result.destination) return
                    const items = Array.from(survey.questions)
                    const [reorderedItem] = items.splice(result.source.index, 1)
                    items.splice(result.destination.index, 0, reorderedItem)
                    setSurvey({ ...survey, questions: items })

                    // Update active question index if it was moved
                    if (activeQuestionIndex === result.source.index) {
                      setActiveQuestionIndex(result.destination.index)
                    }
                  }}
                >
                  <Droppable droppableId="questions">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {survey.questions.map((question, questionIndex) => (
                          <Draggable key={question.id} draggableId={question.id} index={questionIndex}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-6 rounded-lg border ${
                                  activeQuestionIndex === questionIndex
                                    ? "border-indigo-500 ring-2 ring-indigo-200"
                                    : "border-gray-200 hover:border-indigo-300"
                                } transition-colors`}
                                onClick={() => setActiveQuestionIndex(questionIndex)}
                              >
                                <div className="flex items-center gap-2 mb-4">
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                  <span className="flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 text-xs font-medium">
                                    {questionIndex + 1}
                                  </span>
                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                                    {questionTypeInfo[question.type].name}
                                  </span>
                                </div>
                                {renderQuestionFields(question, questionIndex)}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <div className="flex justify-end pt-4 sm:pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting || !isAuthenticated}
                  className={`inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg transition-colors ${
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

        {/* Preview panel */}
        {previewMode && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:w-1/2">
            <div className="sticky top-4">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Eye className="h-5 w-5 text-indigo-500 mr-2" />
                  Survey Preview
                </h2>
                <p className="text-sm text-gray-500">This is how your survey will appear to respondents.</p>
              </div>
              {renderPreview()}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CreateSurvey

