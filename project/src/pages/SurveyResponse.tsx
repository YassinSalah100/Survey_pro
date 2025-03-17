"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  ArrowLeft,
  Loader2,
  Calendar,
  Clock3,
  PartyPopper,
  Sparkles,
  Star,
  MessageCircle,
  CheckSquare,
  Circle,
  BarChart4,
  Lightbulb,
  Zap,
  Bookmark,
  Image,
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
}

interface Question {
  id: string
  title: string
  description?: string
  type: number // Changed to number to match API response
  options?: string[]
  isRequired: boolean
  imageUrl?: string
}

// Question types enum to match API numeric types
enum QuestionType {
  Rating = 0,
  MultipleChoice = 1,
  Text = 2,
  Checkbox = 3,
  NPS = 4,
  Date = 5,
  Time = 6,
  ClosedEnded = 7,
}

interface Answer {
  questionId: string
  value: string | string[]
}

export default function SurveyResponse() {
  const params = useParams()
  const navigate = useNavigate()
  const surveyId = params.id as string
  const confettiRef = useRef<HTMLDivElement>(null)

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [viewMode, setViewMode] = useState<"single" | "all">("single")
  const [progress, setProgress] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipMessage, setTooltipMessage] = useState("")
  const [tooltipType, setTooltipType] = useState<"success" | "error" | "info">("info")
  const [remainingRequired, setRemainingRequired] = useState<number>(0)
  const [showCompletionMessage, setShowCompletionMessage] = useState(false)
  const [userCompletedLastQuestion, setUserCompletedLastQuestion] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)

  // Helper function to ensure image URLs use HTTPS
  const getSecureImageUrl = (url: string | undefined) => {
    if (!url) return "/placeholder.svg"

    // If it's already a relative URL, return as is
    if (url.startsWith("/")) return url

    // If it's an absolute URL, ensure it uses HTTPS
    return url.replace("http://", "https://")
  }

  // Refs for scroll handling
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])

  // Get a color for each question type
  const getQuestionTypeColor = (type: QuestionType) => {
    switch (type) {
      case QuestionType.Rating:
        return "from-slate-700 to-slate-800"
      case QuestionType.MultipleChoice:
        return "from-slate-700 to-slate-800"
      case QuestionType.Text:
        return "from-slate-700 to-slate-800"
      case QuestionType.Checkbox:
        return "from-slate-700 to-slate-800"
      case QuestionType.NPS:
        return "from-slate-700 to-slate-800"
      case QuestionType.Date:
        return "from-slate-700 to-slate-800"
      case QuestionType.Time:
        return "from-slate-700 to-slate-800"
      case QuestionType.ClosedEnded:
        return "from-slate-700 to-slate-800"
      default:
        return "from-slate-700 to-slate-800"
    }
  }

  // Get an icon for each question type
  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case QuestionType.Rating:
        return <Star className="h-5 w-5" />
      case QuestionType.MultipleChoice:
        return <Circle className="h-5 w-5" />
      case QuestionType.Text:
        return <MessageCircle className="h-5 w-5" />
      case QuestionType.Checkbox:
        return <CheckSquare className="h-5 w-5" />
      case QuestionType.NPS:
        return <BarChart4 className="h-5 w-5" />
      case QuestionType.Date:
        return <Calendar className="h-5 w-5" />
      case QuestionType.Time:
        return <Clock3 className="h-5 w-5" />
      case QuestionType.ClosedEnded:
        return <Lightbulb className="h-5 w-5" />
      default:
        return <Bookmark className="h-5 w-5" />
    }
  }

  // Get a label for each question type
  const getQuestionTypeLabel = (type: QuestionType) => {
    switch (type) {
      case QuestionType.Rating:
        return "Rating Scale"
      case QuestionType.MultipleChoice:
        return "Select One"
      case QuestionType.Text:
        return "Open Response"
      case QuestionType.Checkbox:
        return "Select Multiple"
      case QuestionType.NPS:
        return "Net Promoter Score"
      case QuestionType.Date:
        return "Date Selection"
      case QuestionType.Time:
        return "Time Selection"
      case QuestionType.ClosedEnded:
        return "Brief Answer"
      default:
        return "Question"
    }
  }

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) {
        setError("Survey ID is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Make sure we're using the correct API endpoint
        const response = await fetch(`/api/surveys/${surveyId}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Survey not found")
          } else {
            throw new Error(`API error: ${response.status}`)
          }
        }

        // Check if the response is JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format. Expected JSON.")
        }

        const data = await response.json()
        console.log("Survey data:", data) // Debug log
        setSurvey(data)

        // Initialize answers array with empty values based on question type
        const initialAnswers = data.questions.map((question: Question) => ({
          questionId: question.id,
          value: question.type === QuestionType.Checkbox ? [] : "",
        }))
        setAnswers(initialAnswers)

        // Initialize question refs array
        questionRefs.current = data.questions.map(() => null)
      } catch (err) {
        console.error("Error fetching survey:", err)
        setError(`Failed to load survey: ${err instanceof Error ? err.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [surveyId])

  // Update progress when answers change
  useEffect(() => {
    if (!survey) return

    const answeredCount = answers.filter((answer) => {
      if (Array.isArray(answer.value)) {
        return answer.value.length > 0
      }
      return answer.value !== ""
    }).length

    const totalQuestions = survey.questions.length
    const newProgress = Math.round((answeredCount / totalQuestions) * 100)
    setProgress(newProgress)

    // Calculate remaining required questions
    const unansweredRequired = survey.questions.filter((question) => {
      // Find the corresponding answer by questionId
      const answer = answers.find((a) => a.questionId === question.id)
      if (!question.isRequired) return false

      if (Array.isArray(answer?.value)) {
        return answer.value.length === 0
      }

      return !answer?.value
    }).length

    setRemainingRequired(unansweredRequired)
  }, [answers, survey, currentQuestionIndex, viewMode])

  // This effect controls the completion message visibility
  useEffect(() => {
    // Only show completion message if the user has explicitly completed the last question
    if (userCompletedLastQuestion && survey && currentQuestionIndex === survey.questions.length - 1) {
      setShowCompletionMessage(true)
    } else {
      setShowCompletionMessage(false)
    }
  }, [userCompletedLastQuestion, currentQuestionIndex, survey])

  const handleTextChange = (questionId: string, value: string) => {
    // Clear any existing submit error when user types an answer
    if (submitError) {
      setSubmitError(null)
    }

    setAnswers((prev) => prev.map((answer) => (answer.questionId === questionId ? { ...answer, value } : answer)))
  }

  const handleMultipleChoiceChange = (questionId: string, value: string) => {
    // Clear any existing submit error when user selects an answer
    if (submitError) {
      setSubmitError(null)
    }

    setAnswers((prev) => prev.map((answer) => (answer.questionId === questionId ? { ...answer, value } : answer)))
  }

  const handleCheckboxChange = (questionId: string, value: string, checked: boolean) => {
    // Clear any existing submit error when user selects an answer
    if (submitError) {
      setSubmitError(null)
    }

    setAnswers((prev) =>
      prev.map((answer) => {
        if (answer.questionId === questionId) {
          const currentValues = Array.isArray(answer.value) ? answer.value : []
          let newValues: string[]

          if (checked) {
            newValues = [...currentValues, value]
          } else {
            newValues = currentValues.filter((v) => v !== value)
          }

          return { ...answer, value: newValues }
        }
        return answer
      }),
    )
  }

  const validateAnswers = (showErrors = false) => {
    if (!survey) return false

    // Find all required questions that haven't been answered
    const unansweredRequired = survey.questions.filter((question) => {
      // Find the corresponding answer by questionId
      const answer = answers.find((a) => a.questionId === question.id)
      if (!question.isRequired) return false

      // Check if the answer exists and has a value
      if (!answer) return true

      if (Array.isArray(answer.value)) {
        return answer.value.length === 0
      }

      return !answer.value || answer.value.trim() === ""
    })

    if (unansweredRequired.length > 0) {
      // Only show error messages if showErrors is true
      if (showErrors) {
        setSubmitError(`Please answer all required questions (${unansweredRequired.length} remaining)`)

        // If in all questions mode, scroll to the first unanswered required question
        if (viewMode === "all" && questionRefs.current.length > 0) {
          // Find the index in the questions array
          const firstUnansweredIndex = survey.questions.findIndex((q) =>
            unansweredRequired.some((uq) => uq.id === q.id),
          )

          if (firstUnansweredIndex >= 0 && questionRefs.current[firstUnansweredIndex]) {
            questionRefs.current[firstUnansweredIndex]?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }
        } else if (viewMode === "single") {
          // Find the index of the first unanswered required question
          const firstUnansweredIndex = survey.questions.findIndex((q) =>
            unansweredRequired.some((uq) => uq.id === q.id),
          )

          if (firstUnansweredIndex >= 0) {
            setCurrentQuestionIndex(firstUnansweredIndex)
            showTooltipMessage("This question requires an answer", "error")
          }
        }
      }

      return false
    }

    return true
  }

  const showTooltipMessage = (message: string, type: "success" | "error" | "info" = "info") => {
    setTooltipMessage(message)
    setTooltipType(type)
    setShowTooltip(true)

    setTimeout(() => {
      setShowTooltip(false)
    }, 3000)
  }

  const triggerConfetti = () => {
    if (confettiRef.current) {
      const rect = confettiRef.current.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2

      confetti({
        particleCount: 200,
        spread: 100,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F3", "#33FFF3"],
        shapes: ["circle", "square", "star"],
        ticks: 400,
        disableForReducedMotion: true,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateAnswers(true)) return

    try {
      setSubmitting(true)

      // Map to the correct format expected by the API
      const formattedResponses = answers.map((answer) => {
        // Determine if this is a checkbox/multiple selection question
        const isMultiSelect = Array.isArray(answer.value)

        return {
          questionId: answer.questionId,
          // For checkbox questions, use the array as the value
          // For other questions, use the string value
          // But always provide both fields
          answer: isMultiSelect ? "" : answer.value, // Empty string instead of null
          selectedOptions: isMultiSelect ? answer.value : [], // Empty array instead of null
        }
      })

      console.log("Submitting data:", formattedResponses) // Keep this debug log

      const response = await fetch(`/api/surveys/${surveyId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedResponses),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = `API error: ${response.status}`

        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } else {
          const errorText = await response.text()
          console.error("API response:", errorText)
        }

        throw new Error(errorMessage)
      }

      setSuccess(true)
      triggerConfetti()

      setTimeout(() => {
        navigate("/surveys")
      }, 5000)
    } catch (err) {
      console.error("Error submitting survey responses:", err)
      setSubmitError(`Failed to submit your responses: ${err instanceof Error ? err.message : "Please try again."}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextQuestion = () => {
    if (!survey) return

    // Check if current question is required but not answered
    const currentQuestion = survey.questions[currentQuestionIndex]
    const currentAnswer = answers.find((a) => a.questionId === currentQuestion.id)

    // For required questions, check if they have been answered
    if (currentQuestion.isRequired) {
      const isAnswered = Array.isArray(currentAnswer?.value)
        ? currentAnswer.value.length > 0
        : Boolean(currentAnswer?.value)

      if (!isAnswered) {
        // Show error message if required question is not answered
        showTooltipMessage("Please answer this question before proceeding", "error")
        return
      }
    }

    // Proceed to next question if validation passes
    if (currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setShowCompletionMessage(false) // Hide completion message when moving to next question
      setUserCompletedLastQuestion(false) // Reset the flag when moving to a new question
    } else {
      // If we're on the last question and moving forward, mark as completed
      // This is the ONLY place where we set userCompletedLastQuestion to true
      setUserCompletedLastQuestion(true)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setShowCompletionMessage(false) // Hide completion message when moving to previous question
      setUserCompletedLastQuestion(false) // Reset the flag when moving to a previous question
    }
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === "single" ? "all" : "single")
    setShowCompletionMessage(false) // Hide completion message when changing view mode
    setUserCompletedLastQuestion(false) // Reset the flag when changing view mode
  }

  const openImageModal = (imageUrl: string) => {
    setCurrentImage(getSecureImageUrl(imageUrl))
    setImageModalOpen(true)
  }

  const closeImageModal = () => {
    setImageModalOpen(false)
    setCurrentImage(null)
  }

  // Render different input types based on question type
  const renderQuestionInput = (question: Question, index: number) => {
    // Find the answer by questionId, not by index
    const answer = answers.find((a) => a.questionId === question.id)
    const questionColor = getQuestionTypeColor(question.type)
    const questionLabel = getQuestionTypeLabel(question.type)

    switch (question.type) {
      case QuestionType.Text:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-3 left-4 bg-slate-800 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md z-10">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <textarea
              className="w-full p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all resize-none bg-white shadow-sm text-gray-700 font-medium"
              rows={5}
              placeholder="Share your detailed thoughts here..."
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
            />
            <div className="absolute bottom-3 right-3 text-gray-500 text-xs font-medium bg-white/80 px-2 py-1 rounded-full">
              {(answer?.value as string)?.length || 0} characters
            </div>
          </motion.div>
        )

      case QuestionType.ClosedEnded:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-emerald-600/20 rounded-2xl blur-md"></div>
              <input
                type="text"
                className="relative w-full p-5 border-2 border-teal-200 rounded-2xl focus:ring-4 focus:ring-teal-200 focus:border-teal-400 transition-all bg-white backdrop-blur-sm shadow-lg text-gray-700 font-medium"
                placeholder="Type your brief answer here..."
                value={(answer?.value as string) || ""}
                onChange={(e) => handleTextChange(question.id, e.target.value)}
                required={question.isRequired}
                maxLength={100}
              />
              <div className="absolute bottom-3 right-3 text-gray-500 text-xs font-medium bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                {(answer?.value as string)?.length || 0}/100
              </div>
            </div>
          </motion.div>
        )

      case QuestionType.MultipleChoice:
        return (
          <motion.div
            className="space-y-3.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <Circle className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4 pt-2">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-600/10 rounded-2xl blur-md"></div>
              <div className="relative space-y-3.5 p-2">
                {question.options?.map((option, optionIndex) => (
                  <motion.div
                    key={optionIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + optionIndex * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="transform transition-all"
                  >
                    <label
                      className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        answer?.value === option
                          ? "border-blue-500 bg-blue-50 shadow-lg"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                          answer?.value === option ? "border-blue-500 bg-blue-500 shadow-inner" : "border-gray-300"
                        }`}
                      >
                        {answer?.value === option && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2.5 h-2.5 bg-white rounded-full"
                          />
                        )}
                      </div>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answer?.value === option}
                        onChange={() => handleMultipleChoiceChange(question.id, option)}
                        className="sr-only"
                        required={question.isRequired}
                      />
                      <span
                        className={`text-gray-700 ${answer?.value === option ? "font-semibold" : "font-medium"} text-base`}
                      >
                        {option}
                      </span>
                    </label>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )

      case QuestionType.Checkbox:
        return (
          <motion.div
            className="space-y-3.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4 pt-2">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-600/10 rounded-2xl blur-md"></div>
              <div className="relative space-y-3.5 p-2">
                {question.options?.map((option, optionIndex) => {
                  const isChecked = Array.isArray(answer?.value) && answer.value.includes(option)

                  return (
                    <motion.div
                      key={optionIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + optionIndex * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="transform transition-all"
                    >
                      <label
                        className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isChecked
                            ? "border-amber-500 bg-amber-50 shadow-lg"
                            : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-md border-2 flex items-center justify-center mr-4 transition-all ${
                            isChecked ? "border-amber-500 bg-amber-500 shadow-inner" : "border-gray-300"
                          }`}
                        >
                          {isChecked && (
                            <motion.svg
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          value={option}
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                          className="sr-only"
                        />
                        <span className={`text-gray-700 ${isChecked ? "font-semibold" : "font-medium"} text-base`}>
                          {option}
                        </span>
                      </label>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )

      case QuestionType.Rating:
        return (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <Star className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-600/10 rounded-2xl blur-md"></div>
              <div className="relative flex justify-between flex-wrap gap-2 py-6 px-4">
                {question.options?.map((option, optionIndex) => (
                  <motion.div
                    key={optionIndex}
                    className="flex flex-col items-center gap-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + optionIndex * 0.05 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <button
                      type="button"
                      className={`w-16 h-16 flex items-center justify-center rounded-full text-lg font-semibold transition-all ${
                        answer?.value === option
                          ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white scale-110 shadow-lg"
                          : "bg-white border-2 border-violet-200 text-gray-700 hover:border-violet-400 hover:bg-violet-50"
                      }`}
                      onClick={() => handleMultipleChoiceChange(question.id, option)}
                    >
                      {optionIndex + 1}
                    </button>
                    <span className="text-center text-sm text-gray-600 font-medium">{option}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )

      case QuestionType.NPS:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <BarChart4 className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-pink-600/10 rounded-2xl blur-md"></div>
              <div className="relative flex flex-wrap gap-1 justify-center py-6 px-4">
                {question.options?.map((option, optionIndex) => {
                  // Determine color based on NPS range
                  const getButtonStyle = () => {
                    if (answer?.value === option) {
                      return "bg-gradient-to-r from-rose-500 to-pink-600 text-white scale-110 shadow-lg"
                    }

                    if (optionIndex < 3) {
                      return "bg-white border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-400"
                    } else if (optionIndex < 7) {
                      return "bg-white border-2 border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400"
                    } else {
                      return "bg-white border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400"
                    }
                  }

                  return (
                    <motion.button
                      type="button"
                      key={optionIndex}
                      className={`w-12 h-12 flex items-center justify-center rounded-lg text-md font-semibold transition-all ${getButtonStyle()}`}
                      onClick={() => handleMultipleChoiceChange(question.id, option)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + optionIndex * 0.03 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {option}
                    </motion.button>
                  )
                })}
              </div>
              <div className="flex justify-between text-sm text-gray-600 font-medium px-4 mt-3">
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">Not likely</span>
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">Extremely likely</span>
              </div>
            </div>
          </motion.div>
        )

      case QuestionType.Date:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <Calendar className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 rounded-2xl blur-md"></div>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Calendar className="h-5 w-5 text-fuchsia-500" />
                </div>
                <input
                  type="date"
                  className="pl-12 p-5 w-full border-2 border-fuchsia-200 rounded-xl focus:ring-4 focus:ring-fuchsia-200 focus:border-fuchsia-400 transition-all bg-white backdrop-blur-sm shadow-lg text-gray-700 font-medium"
                  value={(answer?.value as string) || ""}
                  onChange={(e) => handleTextChange(question.id, e.target.value)}
                  required={question.isRequired}
                />
              </div>
            </div>
          </motion.div>
        )

      case QuestionType.Time:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-3 left-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg z-10">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{questionLabel}</span>
            </div>
            <div className="relative mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-2xl blur-md"></div>
              <div className="relative mt-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Clock3 className="h-5 w-5 text-cyan-500" />
                </div>
                <input
                  type="time"
                  className="pl-12 p-5 w-full border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-400 transition-all bg-white backdrop-blur-sm shadow-lg text-gray-700 font-medium"
                  value={(answer?.value as string) || ""}
                  onChange={(e) => handleTextChange(question.id, e.target.value)}
                  required={question.isRequired}
                />
              </div>
            </div>
          </motion.div>
        )

      default:
        return <p className="text-red-500">Unsupported question type: {question.type}</p>
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <motion.div
              className="absolute inset-0 rounded-full border-t-4 border-b-4 border-indigo-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-4 rounded-full border-t-4 border-b-4 border-purple-500"
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-8 rounded-full border-t-4 border-b-4 border-pink-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <Sparkles className="absolute inset-0 w-full h-full text-indigo-400 p-8" />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-gray-700 text-xl font-semibold"
          >
            Preparing your survey experience...
          </motion.p>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full mt-6 max-w-xs mx-auto"
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <motion.div
            className="bg-gradient-to-br from-red-50 to-red-100 p-10 rounded-3xl inline-block shadow-2xl border border-red-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <AlertCircle className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-red-800 mb-4">Oops! Something went wrong</h3>
            <p className="text-lg font-medium mb-8 text-red-700">{error}</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl hover:from-red-700 hover:to-rose-800 transition-all shadow-lg flex items-center justify-center gap-2 font-medium"
              >
                <Zap className="h-5 w-5" />
                Try again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/surveys")}
                className="px-6 py-3.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg flex items-center justify-center gap-2 font-medium"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to surveys
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <motion.div
            className="bg-gradient-to-br from-yellow-50 to-amber-100 p-10 rounded-3xl inline-block shadow-2xl border border-amber-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <AlertCircle className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-amber-800 mb-4">Survey Not Found</h3>
            <p className="text-lg font-medium mb-8 text-amber-700">
              No survey data available. The survey may have been deleted or is no longer active.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/surveys")}
              className="mt-6 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-xl hover:from-amber-700 hover:to-orange-800 transition-all shadow-xl flex items-center justify-center gap-3 mx-auto font-medium text-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to surveys
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 relative">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-2.5 bg-gray-200 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-r-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-xl z-50 flex items-center ${
                tooltipType === "success"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : tooltipType === "error"
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              }`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {tooltipType === "success" && <CheckCircle className="h-5 w-5 mr-2" />}
              {tooltipType === "error" && <AlertCircle className="h-5 w-5 mr-2" />}
              {tooltipType === "info" && <Clock className="h-5 w-5 mr-2" />}
              <span className="font-medium">{tooltipMessage}</span>
              <button onClick={() => setShowTooltip(false)} className="ml-2 text-white/80 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Modal */}
        <AnimatePresence>
          {imageModalOpen && currentImage && (
            <motion.div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeImageModal}
            >
              <motion.div
                className="relative max-w-5xl max-h-[90vh] overflow-hidden"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={getSecureImageUrl(currentImage) || "/placeholder.svg"}
                  alt="Enlarged view"
                  className="max-h-[90vh] max-w-full object-contain"
                />
                <button
                  className="absolute top-4 right-4 bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={closeImageModal}
                >
                  <X className="h-6 w-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Survey header */}
        <div className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-8 border border-gray-100"
          >
            <button
              onClick={() => navigate("/surveys")}
              className="flex items-center text-slate-700 hover:text-slate-900 mb-6 transition-colors group"
            >
              <span className="bg-slate-100 group-hover:bg-slate-200 p-2 rounded-full mr-2 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </span>
              <span className="font-medium">Back to surveys</span>
            </button>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4 leading-tight">{survey.title}</h1>
                <div className="relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 rounded-full"></div>
                  <p className="text-gray-600 text-lg pl-4">{survey.description}</p>
                </div>
              </div>

              {survey.coverImageUrl && (
                <div className="md:w-1/3 w-full">
                  <div
                    className="relative cursor-pointer overflow-hidden rounded-lg shadow-md"
                    onClick={() => openImageModal(survey.coverImageUrl || "")}
                  >
                    <img
                      src={getSecureImageUrl(survey.coverImageUrl) || "/placeholder.svg"}
                      alt="Survey cover"
                      className="w-full h-48 object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center transition-all">
                      <div className="bg-white/0 hover:bg-white/80 p-2 rounded-full transform scale-0 hover:scale-100 transition-all">
                        <Image className="h-6 w-6 text-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* View mode toggle */}
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  {remainingRequired > 0 ? (
                    <span className="flex items-center text-amber-700 bg-amber-50 px-4 py-2 rounded-full">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="font-medium">{remainingRequired} required questions remaining</span>
                    </span>
                  ) : progress === 100 ? (
                    <span className="flex items-center text-green-700 bg-green-50 px-4 py-2 rounded-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="font-medium">All questions answered</span>
                    </span>
                  ) : (
                    <span className="flex items-center text-slate-700 bg-slate-50 px-4 py-2 rounded-full">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="font-medium">{survey.questions.length} questions total</span>
                    </span>
                  )}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleViewMode}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition-all shadow-sm flex items-center justify-center gap-2 text-sm font-medium"
              >
                {viewMode === "single" ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    View all questions
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    View one question at a time
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit}>
          {viewMode === "single" ? (
            <div className="mb-8">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="p-8 bg-white rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden"
              >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-500/10 to-purple-500/10 rounded-bl-full -z-10" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-tr-full -z-10" />

                {showCompletionMessage && currentQuestionIndex === survey.questions.length - 1 ? (
                  <motion.div
                    className="text-center py-10"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="relative mx-auto mb-8 w-32 h-32"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-md"></div>
                      <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 w-full h-full rounded-full flex items-center justify-center shadow-xl">
                        <PartyPopper className="h-16 w-16 text-white" />
                      </div>
                    </motion.div>
                    <motion.h3
                      className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-700 mb-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Thank You for Completing the Survey!
                    </motion.h3>
                    <motion.p
                      className="text-gray-600 mb-8 text-lg font-medium max-w-2xl mx-auto"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      You've answered all the questions. Your feedback is valuable to us! Please click the submit button
                      below to send your responses.
                    </motion.p>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className={`px-8 py-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md flex items-center mx-auto text-lg font-medium ${
                        submitting ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Responses
                          <Send className="h-6 w-6 ml-3" />
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-8">
                      <div className="flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <span className="flex items-center justify-center bg-slate-800 text-white rounded-full w-14 h-14 mb-2 shadow-md text-xl font-bold">
                            {currentQuestionIndex + 1}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">of {survey.questions.length}</span>

                          {/* Question type indicator */}
                          <div className="mt-6 flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-md">
                              {getQuestionTypeIcon(survey.questions[currentQuestionIndex].type)}
                            </div>
                            <span className="mt-2 text-xs font-medium text-gray-500">
                              {getQuestionTypeLabel(survey.questions[currentQuestionIndex].type)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                          {survey.questions[currentQuestionIndex].title}
                          {survey.questions[currentQuestionIndex].isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </h3>
                        {survey.questions[currentQuestionIndex].description && (
                          <div className="relative mb-6">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 rounded-full"></div>
                            <p className="text-gray-600 pl-4">{survey.questions[currentQuestionIndex].description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {survey.questions[currentQuestionIndex].imageUrl && (
                      <div className="mb-8">
                        <div
                          className="relative cursor-pointer overflow-hidden rounded-lg shadow-md"
                          onClick={() => openImageModal(survey.questions[currentQuestionIndex].imageUrl || "")}
                        >
                          <img
                            src={
                              getSecureImageUrl(survey.questions[currentQuestionIndex].imageUrl) || "/placeholder.svg"
                            }
                            alt={`Image for ${survey.questions[currentQuestionIndex].title}`}
                            className="max-h-72 w-full object-contain mx-auto transition-transform duration-500 hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center transition-all">
                            <div className="bg-white p-3 rounded-full transform scale-0 hover:scale-100 transition-all">
                              <Image className="h-6 w-6 text-slate-700" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 relative">
                      {renderQuestionInput(survey.questions[currentQuestionIndex], currentQuestionIndex)}
                    </div>

                    <div className="flex justify-between mt-12">
                      <motion.button
                        type="button"
                        onClick={handlePrevQuestion}
                        disabled={currentQuestionIndex === 0}
                        className={`px-6 py-3.5 rounded-xl transition-all flex items-center gap-2 font-medium ${
                          currentQuestionIndex === 0
                            ? "text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200"
                        }`}
                        whileHover={currentQuestionIndex !== 0 ? { scale: 1.05 } : {}}
                        whileTap={currentQuestionIndex !== 0 ? { scale: 0.95 } : {}}
                      >
                        <ChevronLeft className="h-5 w-5" />
                        Previous
                      </motion.button>

                      {currentQuestionIndex < survey.questions.length - 1 ? (
                        <motion.button
                          type="button"
                          onClick={handleNextQuestion}
                          className="px-6 py-3.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md flex items-center gap-2 font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Next
                          <ChevronRight className="h-5 w-5" />
                        </motion.button>
                      ) : (
                        <motion.button
                          type="button"
                          onClick={handleNextQuestion}
                          className="px-6 py-3.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md flex items-center gap-2 font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Finish
                          <CheckCircle className="h-5 w-5" />
                        </motion.button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="space-y-10">
              {survey.questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  ref={(el) => (questionRefs.current[index] = el)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-8 bg-white rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden"
                >
                  {/* Decorative background elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-purple-500/10 rounded-bl-full -z-10" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-tr-full -z-10" />

                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-md opacity-70"></div>
                        <span className="relative flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-full w-12 h-12 shadow-lg text-lg font-bold">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-md bg-gradient-to-r ${getQuestionTypeColor(question.type)} text-white`}
                        >
                          {getQuestionTypeIcon(question.type)}
                          <span>{getQuestionTypeLabel(question.type)}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {question.title}
                          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                      </div>
                      {question.description && (
                        <div className="relative mb-5">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500/50 to-purple-600/50 rounded-full"></div>
                          <p className="text-gray-600 pl-4 italic">{question.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {question.imageUrl && (
                    <div className="my-6">
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => openImageModal(question.imageUrl || "")}
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
                        <div className="relative">
                          <img
                            src={getSecureImageUrl(question.imageUrl) || "/placeholder.svg"}
                            alt={`Image for ${question.title}`}
                            className="rounded-xl max-h-64 object-contain shadow-lg group-hover:shadow-xl transition-all"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all rounded-xl">
                            <div className="bg-white/0 group-hover:bg-white/80 p-2 rounded-full transform scale-0 group-hover:scale-100 transition-all">
                              <Image className="h-6 w-6 text-indigo-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 relative">{renderQuestionInput(question, index)}</div>
                </motion.div>
              ))}

              {submitError && (
                <motion.div
                  className="p-5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-xl shadow-lg border border-red-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <span className="font-medium">{submitError}</span>
                  </div>
                </motion.div>
              )}

              {progress === 100 && (
                <motion.div
                  className="p-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl text-center shadow-lg border border-indigo-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-md"></div>
                    <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 w-full h-full rounded-full flex items-center justify-center shadow-lg">
                      <PartyPopper className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-700 mb-3">
                    All Done!
                  </h3>
                  <p className="text-gray-600 mb-4 font-medium text-lg">
                    Thank you for completing all the questions. Please submit your responses below.
                  </p>
                </motion.div>
              )}

              <motion.div
                className="flex justify-between mt-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  type="button"
                  onClick={() => navigate("/surveys")}
                  className="px-6 py-3.5 bg-white text-gray-800 rounded-xl hover:bg-gray-100 transition-all shadow-lg border border-gray-200 flex items-center gap-3 font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="h-5 w-5" />
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  className={`px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl hover:from-indigo-700 hover:to-purple-800 transition-all shadow-lg flex items-center gap-3 font-medium ${
                    submitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  whileHover={!submitting ? { scale: 1.05 } : {}}
                  whileTap={!submitting ? { scale: 0.95 } : {}}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Responses
                      <Send className="h-5 w-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

