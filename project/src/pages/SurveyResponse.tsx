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
  // Add a flag to track if the user has explicitly clicked the Next button on the last question
  const [userCompletedLastQuestion, setUserCompletedLastQuestion] = useState(false)

  // Refs for scroll handling
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])

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
        particleCount: 100,
        spread: 70,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
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

  // Render different input types based on question type
  const renderQuestionInput = (question: Question, index: number) => {
    // Find the answer by questionId, not by index
    const answer = answers.find((a) => a.questionId === question.id)

    switch (question.type) {
      case QuestionType.Text:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <textarea
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              rows={4}
              placeholder="Your answer"
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
            />
          </motion.div>
        )

      case QuestionType.ClosedEnded:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <input
              type="text"
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Your brief answer"
              value={(answer?.value as string) || ""}
              onChange={(e) => handleTextChange(question.id, e.target.value)}
              required={question.isRequired}
              maxLength={100} // Limit the length for closed-ended responses
            />
          </motion.div>
        )

      case QuestionType.MultipleChoice:
        return (
          <motion.div
            className="space-y-3"
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
              >
                <label
                  className={`flex items-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    answer?.value === option
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                      answer?.value === option ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                    }`}
                  >
                    {answer?.value === option && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 bg-white rounded-full"
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
            className="space-y-3"
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
                >
                  <label
                    className={`flex items-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isChecked
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-3 ${
                        isChecked ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                      }`}
                    >
                      {isChecked && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 text-white"
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
            <div className="flex justify-between flex-wrap gap-2">
              {question.options?.map((option, optionIndex) => (
                <motion.div
                  key={optionIndex}
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + optionIndex * 0.05 }}
                >
                  <button
                    type="button"
                    className={`w-14 h-14 flex items-center justify-center rounded-full text-lg font-medium transition-all ${
                      answer?.value === option
                        ? "bg-indigo-600 text-white scale-110 shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                    }`}
                    onClick={() => handleMultipleChoiceChange(question.id, option)}
                  >
                    {optionIndex + 1}
                  </button>
                  <span className="text-center text-xs text-gray-500">{option}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )

      case QuestionType.NPS:
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex flex-wrap gap-2 mb-2 justify-center">
              {question.options?.map((option, optionIndex) => (
                <motion.button
                  type="button"
                  key={optionIndex}
                  className={`w-12 h-12 flex items-center justify-center rounded-md text-md font-medium transition-all ${
                    answer?.value === option
                      ? "bg-indigo-600 text-white scale-110 shadow-md"
                      : optionIndex < 3
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : optionIndex < 7
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                  onClick={() => handleMultipleChoiceChange(question.id, option)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + optionIndex * 0.03 }}
                >
                  {option}
                </motion.button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 px-1 mt-3">
              <span>Not likely</span>
              <span>Extremely likely</span>
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              className="pl-10 p-4 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Clock3 className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="time"
              className="pl-10 p-4 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600 text-lg">Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-6 rounded-lg inline-block shadow-sm">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => navigate("/surveys")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          className="text-center bg-green-50 p-8 rounded-lg shadow-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          ref={confettiRef}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          </motion.div>
          <motion.h2
            className="text-3xl font-bold text-green-800 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Thank You!
          </motion.h2>
          <motion.p
            className="text-green-700 mb-6 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Your responses have been submitted successfully.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <p className="text-gray-600 mb-6">Redirecting you back to the surveys page...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <motion.div
                className="bg-green-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 5 }}
              />
            </div>
            <button
              onClick={() => navigate("/surveys")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="bg-yellow-100 text-yellow-700 p-6 rounded-lg inline-block shadow-sm">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg font-medium">
              No survey data available. The survey may have been deleted or is no longer active.
            </p>
            <button
              onClick={() => navigate("/surveys")}
              className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to surveys
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center ${
              tooltipType === "success"
                ? "bg-green-100 text-green-800"
                : tooltipType === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
            }`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {tooltipType === "success" && <CheckCircle className="h-5 w-5 mr-2" />}
            {tooltipType === "error" && <AlertCircle className="h-5 w-5 mr-2" />}
            {tooltipType === "info" && <Clock className="h-5 w-5 mr-2" />}
            <span>{tooltipMessage}</span>
            <button onClick={() => setShowTooltip(false)} className="ml-2 text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survey header */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <button
            onClick={() => navigate("/surveys")}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to surveys
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{survey.title}</h1>
          <p className="text-gray-600">{survey.description}</p>
          {survey.coverImageUrl && (
            <div className="mt-4 mb-6">
              <img
                src={survey.coverImageUrl || "/placeholder.svg"}
                alt="Survey cover"
                className="rounded-lg w-full max-h-64 object-cover shadow-md"
              />
            </div>
          )}

          {/* View mode toggle */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {remainingRequired > 0 ? (
                  <span className="flex items-center text-amber-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {remainingRequired} required questions remaining
                  </span>
                ) : progress === 100 ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    All questions answered
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {survey.questions.length} questions total
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={toggleViewMode}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
            >
              {viewMode === "single" ? "View all questions" : "View one question at a time"}
            </button>
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
              className="p-8 bg-white rounded-xl shadow-sm"
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
                  >
                    <PartyPopper className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
                  </motion.div>
                  <motion.h3
                    className="text-2xl font-bold text-indigo-800 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Thank You for Completing the Survey!
                  </motion.h3>
                  <motion.p
                    className="text-gray-600 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    You've answered all the questions. Please click the submit button below to send your responses.
                  </motion.p>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center mx-auto ${
                      submitting ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Responses
                        <Send className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-start mb-6">
                    <div className="flex flex-col items-center mr-4">
                      <span className="flex items-center justify-center bg-indigo-600 text-white rounded-full w-10 h-10 mb-2">
                        {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs text-gray-500">of {survey.questions.length}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-medium text-gray-900 mb-1">
                        {survey.questions[currentQuestionIndex].title}
                        {survey.questions[currentQuestionIndex].isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h3>
                      {survey.questions[currentQuestionIndex].description && (
                        <p className="text-gray-600 mb-4">{survey.questions[currentQuestionIndex].description}</p>
                      )}
                    </div>
                  </div>

                  {survey.questions[currentQuestionIndex].imageUrl && (
                    <div className="mb-6">
                      <img
                        src={survey.questions[currentQuestionIndex].imageUrl || "/placeholder.svg"}
                        alt={`Image for ${survey.questions[currentQuestionIndex].title}`}
                        className="rounded-lg max-h-64 object-contain mx-auto"
                      />
                    </div>
                  )}

                  <div className="mt-6">
                    {renderQuestionInput(survey.questions[currentQuestionIndex], currentQuestionIndex)}
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                      className={`px-4 py-2 flex items-center rounded-lg transition-colors ${
                        currentQuestionIndex === 0
                          ? "text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      Previous
                    </button>

                    {currentQuestionIndex < survey.questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                      >
                        Next
                        <ChevronRight className="h-5 w-5 ml-1" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                      >
                        Next
                        <ChevronRight className="h-5 w-5 ml-1" />
                      </button>
                    )}
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
                className="p-6 bg-white rounded-xl shadow-sm"
              >
                <div className="flex items-start mb-4">
                  <span className="flex items-center justify-center bg-indigo-600 text-white rounded-full w-8 h-8 mr-3 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium text-gray-900">
                      {question.title}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    {question.description && <p className="text-gray-600 mt-1">{question.description}</p>}
                  </div>
                </div>

                {question.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={question.imageUrl || "/placeholder.svg"}
                      alt={`Image for ${question.title}`}
                      className="rounded-lg max-h-64 object-contain"
                    />
                  </div>
                )}

                <div className="mt-4">{renderQuestionInput(question, index)}</div>
              </motion.div>
            ))}

            {submitError && (
              <motion.div
                className="p-4 bg-red-100 text-red-700 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  {submitError}
                </div>
              </motion.div>
            )}

            {progress === 100 && (
              <motion.div
                className="p-6 bg-indigo-50 rounded-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PartyPopper className="h-12 w-12 text-indigo-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-indigo-800 mb-2">All Done!</h3>
                <p className="text-gray-600 mb-4">
                  Thank you for completing all the questions. Please submit your responses below.
                </p>
              </motion.div>
            )}

            <motion.div
              className="flex justify-between mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="button"
                onClick={() => navigate("/surveys")}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center ${
                  submitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Responses
                    <Send className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </form>
    </div>
  )
}

