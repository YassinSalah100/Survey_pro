"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Send, X, ArrowLeft, Loader2, Calendar, Clock3, PartyPopper, Star, ThumbsUp } from 'lucide-react'

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
  // Add a flag to track if the user has explicitly clicked the Next button on the last question
  const [userCompletedLastQuestion, setUserCompletedLastQuestion] = useState(false)

  // Refs for scroll handling
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])

  // Helper function to ensure image URLs use the proxy
  const getProxiedImageUrl = (url: string | undefined) => {
    if (!url) return "/placeholder.svg"

    // If it's already a relative URL, return as is
    if (url.startsWith("/")) return url

    // If it's an API file URL, convert to use our proxy
    if (url.includes("/api/files")) {
      return url.replace("/api/files", "/api/files")
    }

    return url
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

    // IMPORTANT: We're removing the automatic completion message logic
    // The completion message will now ONLY be shown when the user explicitly clicks "Next" on the last question
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

    // IMPORTANT: No auto-advancement logic here
    // No matter what the user types, we don't change the current question or show completion message
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
        particleCount: 150,
        spread: 90,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ["#FF5757", "#47B4FF", "#FFD029", "#70FF57", "#FF57D8"],
        shapes: ["circle", "square"],
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

  // Get a color for a question based on its index
  const getQuestionColor = (index: number) => {
    const colors = [
      "bg-gradient-to-r from-blue-500 to-purple-600",
      "bg-gradient-to-r from-pink-500 to-red-500",
      "bg-gradient-to-r from-yellow-400 to-orange-500",
      "bg-gradient-to-r from-green-400 to-teal-500",
      "bg-gradient-to-r from-purple-500 to-indigo-600",
      "bg-gradient-to-r from-red-500 to-pink-500",
    ]
    return colors[index % colors.length]
  }

  // Get an icon for a question type
  const getQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case QuestionType.Rating:
        return <Star className="h-5 w-5" />
      case QuestionType.MultipleChoice:
        return <CheckCircle className="h-5 w-5" />
      case QuestionType.Text:
        return <MessageSquare className="h-5 w-5" />
      case QuestionType.Checkbox:
        return <CheckSquare className="h-5 w-5" />
      case QuestionType.NPS:
        return <ThumbsUp className="h-5 w-5" />
      case QuestionType.Date:
        return <Calendar className="h-5 w-5" />
      case QuestionType.Time:
        return <Clock3 className="h-5 w-5" />
      case QuestionType.ClosedEnded:
        return <MessageCircle className="h-5 w-5" />
      default:
        return <HelpCircle className="h-5 w-5" />
    }
  }

  // Render different input types based on question type
  const renderQuestionInput = (question: Question, index: number) => {
    // Find the answer by questionId, not by index
    const answer = answers.find((a) => a.questionId === question.id)

    switch (question.type) {
      case QuestionType.Text:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <textarea
              className="w-full p-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none shadow-sm text-gray-700 bg-white/50 backdrop-blur-sm"
              rows={4}
              placeholder="Share your thoughts here..."
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {((answer?.value as string) || "").length} characters
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
            <input
              type="text"
              className="w-full p-5 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm text-gray-700 bg-white/50 backdrop-blur-sm"
              placeholder="Your brief answer"
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
              maxLength={100} // Limit the length for closed-ended responses
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {((answer?.value as string) || "").length}/100
            </div>
          </motion.div>
        )

      case QuestionType.MultipleChoice:
        return (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {question.options?.map((option, optionIndex) => (
              <motion.div
                key={optionIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + optionIndex * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <label
                  className={`flex items-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    answer?.value === option
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                      answer?.value === option ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    }`}
                  >
                    {answer?.value === option && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-white rounded-full"
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
                  <span className={`text-gray-700 ${answer?.value === option ? "font-medium" : ""}`}>{option}</span>
                </label>
              </motion.div>
            ))}
          </motion.div>
        )

      case QuestionType.Checkbox:
        return (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {question.options?.map((option, optionIndex) => {
              const isChecked = Array.isArray(answer?.value) && answer.value.includes(option)

              return (
                <motion.div
                  key={optionIndex}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + optionIndex * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <label
                    className={`flex items-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      isChecked
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mr-4 transition-all ${
                        isChecked ? "border-blue-500 bg-blue-500" : "border-gray-300"
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
                    <span className={`text-gray-700 ${isChecked ? "font-medium" : ""}`}>{option}</span>
                  </label>
                </motion.div>
              )
            })}
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
            <div className="flex justify-between flex-wrap gap-3 py-6">
              {question.options?.map((option, optionIndex) => (
                <motion.div
                  key={optionIndex}
                  className="flex flex-col items-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + optionIndex * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.button
                    type="button"
                    className={`w-16 h-16 flex items-center justify-center rounded-full text-lg font-bold transition-all ${
                      answer?.value === option
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-110 shadow-lg"
                        : "bg-white text-gray-700 hover:bg-gray-100 hover:scale-105 shadow-sm border border-gray-200"
                    }`}
                    onClick={() => handleMultipleChoiceChange(question.id, option)}
                  >
                    {optionIndex + 1}
                  </motion.button>
                  <span className="text-center text-sm text-gray-600 font-medium">{option}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )

      case QuestionType.NPS:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="py-6"
          >
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {question.options?.map((option, optionIndex) => {
                // Determine color based on NPS range
                const getButtonStyle = () => {
                  if (answer?.value === option) {
                    return "bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-110 shadow-lg"
                  }

                  if (optionIndex < 3) {
                    return "bg-white text-red-600 border-red-200 hover:bg-red-50"
                  } else if (optionIndex < 7) {
                    return "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                  } else {
                    return "bg-white text-green-600 border-green-200 hover:bg-green-50"
                  }
                }

                return (
                  <motion.button
                    type="button"
                    key={optionIndex}
                    className={`w-14 h-14 flex items-center justify-center rounded-xl text-lg font-bold transition-all border-2 shadow-sm ${getButtonStyle()}`}
                    onClick={() => handleMultipleChoiceChange(question.id, option)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + optionIndex * 0.03 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {option}
                  </motion.button>
                )
              })}
            </div>
            <div className="flex justify-between text-sm text-gray-600 px-1 mt-6 font-medium">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                <span>Not likely</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-amber-400 mr-2"></div>
                <span>Neutral</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                <span>Extremely likely</span>
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <input
              type="date"
              className="pl-12 p-5 w-full border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
            />
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <Clock3 className="h-5 w-5 text-blue-500" />
            </div>
            <input
              type="time"
              className="pl-12 p-5 w-full border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
            />
          </motion.div>
        )

      default:
        return <p className="text-red-500">Unsupported question type: {question.type}</p>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
            <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading your survey</h2>
          <p className="text-gray-600 text-lg">Please wait while we prepare your questions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-lg font-medium mb-6 text-gray-700">{error}</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-md"
              >
                Try again
              </button>
              <button
                onClick={() => navigate("/surveys")}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors shadow-md"
              >
                Back to surveys
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          className="text-center bg-white p-10 rounded-2xl shadow-xl border border-green-100 max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          ref={confettiRef}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>
          <motion.h2
            className="text-3xl font-bold text-gray-800 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Thank You for Your Feedback!
          </motion.h2>
          <motion.p
            className="text-gray-700 mb-8 text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Your responses have been submitted successfully.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <p className="text-gray-600 mb-6">Redirecting you back to the surveys page...</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-8 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 5 }}
              />
            </div>
            <button
              onClick={() => navigate("/surveys")}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg font-medium text-lg"
            >
              Return to Surveys
            </button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-amber-100 max-w-md">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-amber-800 mb-4">Survey Not Found</h2>
            <p className="text-lg font-medium mb-6 text-gray-700">
              No survey data available. The survey may have been deleted or is no longer active.
            </p>
            <button
              onClick={() => navigate("/surveys")}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all shadow-md"
            >
              Back to surveys
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-16">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className={`fixed top-4 right-4 p-4 rounded-xl shadow-xl z-50 flex items-center ${
              tooltipType === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : tooltipType === "error"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {tooltipType === "success" && <CheckCircle className="h-5 w-5 mr-2" />}
            {tooltipType === "error" && <AlertCircle className="h-5 w-5 mr-2" />}
            {tooltipType === "info" && <Clock className="h-5 w-5 mr-2" />}
            <span className="font-medium">{tooltipMessage}</span>
            <button onClick={() => setShowTooltip(false)} className="ml-3 text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-12 relative">
        {/* Survey header */}
        <div className="mb-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <button
              onClick={() => navigate("/surveys")}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to surveys
            </button>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                {survey.title}
              </h1>
              <p className="text-gray-600 text-lg">{survey.description}</p>

              {survey.coverImageUrl && (
                <div className="mt-6 mb-6 rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={getProxiedImageUrl(survey.coverImageUrl) || "/placeholder.svg"}
                    alt="Survey cover"
                    className="w-full max-h-80 object-cover"
                  />
                </div>
              )}

              {/* View mode toggle */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    {remainingRequired > 0 ? (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    ) : progress === 100 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {remainingRequired > 0 ? (
                      <span className="text-amber-600">{remainingRequired} required questions remaining</span>
                    ) : progress === 100 ? (
                      <span className="text-green-600">All questions answered</span>
                    ) : (
                      <span className="text-gray-600">{survey.questions.length} questions total</span>
                    )}
                  </span>
                </div>
                <button
                  onClick={toggleViewMode}
                  className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-full hover:bg-blue-50 transition-colors shadow-sm font-medium flex items-center justify-center"
                >
                  {viewMode === "single" ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      View all questions
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      View one question at a time
                    </>
                  )}
                </button>
              </div>
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
                className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100"
              >
                {showCompletionMessage && currentQuestionIndex === survey.questions.length - 1 ? (
                  <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                    >
                      <PartyPopper className="h-10 w-10 text-white" />
                    </motion.div>
                    <motion.h3
                      className="text-2xl font-bold text-gray-800 mb-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Thank You for Completing the Survey!
                    </motion.h3>
                    <motion.p
                      className="text-gray-600 mb-8 text-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      You've answered all the questions. Please click the submit button below to send your responses.
                    </motion.p>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className={`px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center mx-auto font-medium text-lg ${
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
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Responses
                          <Send className="h-5 w-5 ml-3" />
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-8">
                      <div className="flex flex-row sm:flex-col items-center sm:items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl ${getQuestionColor(currentQuestionIndex)} flex items-center justify-center text-white font-bold text-lg shadow-md`}
                        >
                          {currentQuestionIndex + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-500">of {survey.questions.length}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                          {survey.questions[currentQuestionIndex].title}
                          {survey.questions[currentQuestionIndex].isRequired && (
                            <span className="text-red-500 ml-2 text-lg">*</span>
                          )}
                        </h3>
                        {survey.questions[currentQuestionIndex].description && (
                          <p className="text-gray-600 text-lg">{survey.questions[currentQuestionIndex].description}</p>
                        )}
                      </div>
                    </div>

                    {survey.questions[currentQuestionIndex].imageUrl && (
                      <div className="mb-8 rounded-xl overflow-hidden shadow-md">
                        <img
                          src={
                            getProxiedImageUrl(survey.questions[currentQuestionIndex].imageUrl) || "/placeholder.svg"
                          }
                          alt={`Image for ${survey.questions[currentQuestionIndex].title}`}
                          className="w-full max-h-80 object-contain"
                        />
                      </div>
                    )}

                    <div className="mt-6">
                      {renderQuestionInput(survey.questions[currentQuestionIndex], currentQuestionIndex)}
                    </div>

                    <div className="flex justify-between mt-10">
                      <button
                        type="button"
                        onClick={handlePrevQuestion}
                        disabled={currentQuestionIndex === 0}
                        className={`px-6 py-3 rounded-xl transition-all flex items-center font-medium ${
                          currentQuestionIndex === 0
                            ? "text-gray-400 cursor-not-allowed"
                            : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 shadow-sm"
                        }`}
                      >
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Previous
                      </button>

                      <motion.button
                        type="button"
                        onClick={handleNextQuestion}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all shadow-md flex items-center font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {currentQuestionIndex < survey.questions.length - 1 ? "Next" : "Complete"}
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="space-y-8">
              {survey.questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  ref={(el) => (questionRefs.current[index] = el)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${getQuestionColor(index)} flex items-center justify-center text-white font-bold text-lg shadow-md`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                        {question.title}
                        {question.isRequired && <span className="text-red-500 ml-2 text-lg">*</span>}
                      </h3>
                      {question.description && <p className="text-gray-600 text-lg">{question.description}</p>}
                    </div>
                  </div>

                  {question.imageUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-md">
                      <img
                        src={getProxiedImageUrl(question.imageUrl) || "/placeholder.svg"}
                        alt={`Image for ${question.title}`}
                        className="w-full max-h-80 object-contain"
                      />
                    </div>
                  )}

                  <div className="mt-6">{renderQuestionInput(question, index)}</div>
                </motion.div>
              ))}

              {submitError && (
                <motion.div
                  className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 shadow-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-6 w-6 mr-3 text-red-500" />
                    <span className="font-medium text-lg">{submitError}</span>
                  </div>
                </motion.div>
              )}

              {progress === 100 && (
                <motion.div
                  className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl text-center border border-blue-100 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <PartyPopper className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">All Done!</h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Thank you for completing all the questions. Please submit your responses below.
                  </p>
                </motion.div>
              )}

              <motion.div
                className="flex flex-col sm:flex-row justify-between gap-4 mt-10 mb-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="button"
                  onClick={() => navigate("/surveys")}
                  className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-md font-medium"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  className={`px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center font-medium text-lg ${
                    submitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Responses
                      <Send className="h-5 w-5 ml-3" />
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

// Missing icon components
function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CheckSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function MessageCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function HelpCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function Eye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ArrowLeftRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 3L4 7l4 4" />
      <path d="M4 7h16" />
      <path d="M16 21l4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  )
}

