"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"

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

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      } catch (err) {
        console.error("Error fetching survey:", err)
        setError(`Failed to load survey: ${err instanceof Error ? err.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [surveyId])

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => prev.map((answer) => (answer.questionId === questionId ? { ...answer, value } : answer)))
  }

  const handleMultipleChoiceChange = (questionId: string, value: string) => {
    setAnswers((prev) => prev.map((answer) => (answer.questionId === questionId ? { ...answer, value } : answer)))
  }

  const handleCheckboxChange = (questionId: string, value: string, checked: boolean) => {
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

  const validateAnswers = () => {
    if (!survey) return false

    const unansweredRequired = survey.questions.filter((question) => {
      const answer = answers.find((a) => a.questionId === question.id)
      if (!question.isRequired) return false

      if (Array.isArray(answer?.value)) {
        return answer.value.length === 0
      }

      return !answer?.value
    })

    if (unansweredRequired.length > 0) {
      setSubmitError(`Please answer all required questions (${unansweredRequired.length} remaining)`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateAnswers()) return

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
      setTimeout(() => {
        navigate("/surveys")
      }, 3000)
    } catch (err) {
      console.error("Error submitting survey responses:", err)
      setSubmitError(`Failed to submit your responses: ${err instanceof Error ? err.message : "Please try again."}`)
    } finally {
      setSubmitting(false)
    }
  }
  // Render different input types based on question type
  const renderQuestionInput = (question: Question) => {
    const answer = answers.find((a) => a.questionId === question.id)

    switch (question.type) {
      case QuestionType.Text:
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={4}
            placeholder="Your answer"
            value={(answer?.value as string) || ""}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            required={question.isRequired}
          />
        )

      case QuestionType.ClosedEnded:
        return (
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Your brief answer"
            value={(answer?.value as string) || ""}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            required={question.isRequired}
            maxLength={100} // Limit the length for closed-ended responses
          />
        )

      case QuestionType.MultipleChoice:
        return (
          <div className="space-y-3">
            {question.options?.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={answer?.value === option}
                  onChange={() => handleMultipleChoiceChange(question.id, option)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                  required={question.isRequired}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case QuestionType.Checkbox:
        return (
          <div className="space-y-3">
            {question.options?.map((option, optionIndex) => {
              const isChecked = Array.isArray(answer?.value) && answer.value.includes(option)

              return (
                <label key={optionIndex} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    value={option}
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              )
            })}
          </div>
        )

        case QuestionType.Rating:
          return (
            <div className="w-full">
              <div className="flex justify-between">
                {question.options?.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex flex-col items-center gap-2 w-20">
                    <button
                      type="button"
                      className={`w-12 h-12 flex items-center justify-center rounded-full text-lg font-medium transition-colors ${
                        answer?.value === option ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => handleMultipleChoiceChange(question.id, option)}
                    >
                      {optionIndex + 1}
                    </button>
                    <span className="text-center text-xs text-gray-500">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          )

      case QuestionType.NPS:
        return (
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {question.options?.map((option, optionIndex) => (
                <button
                  type="button"
                  key={optionIndex}
                  className={`w-10 h-10 flex items-center justify-center rounded-md text-md font-medium transition-colors ${
                    answer?.value === option
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => handleMultipleChoiceChange(question.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 px-1 mt-1">
              <span>Not likely</span>
              <span>Extremely likely</span>
            </div>
          </div>
        )

      case QuestionType.Date:
        return (
          <input
            type="date"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={(answer?.value as string) || ""}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            required={question.isRequired}
          />
        )

      case QuestionType.Time:
        return (
          <input
            type="time"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={(answer?.value as string) || ""}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            required={question.isRequired}
          />
        )

      default:
        return <p className="text-red-500">Unsupported question type: {question.type}</p>
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg inline-block">
            <p>{error}</p>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try again
              </button>
              <button
                onClick={() => navigate("/surveys")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
        <div className="text-center bg-green-100 p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Thank You!</h2>
          <p className="text-green-700 mb-4">Your responses have been submitted successfully.</p>
          <p className="text-gray-600">Redirecting you back to the surveys page...</p>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-lg inline-block">
            <p>No survey data available. The survey may have been deleted or is no longer active.</p>
            <button
              onClick={() => navigate("/surveys")}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to surveys
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{survey.title}</h1>
        <p className="text-gray-600">{survey.description}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {survey.questions.map((question, index) => (
          <div key={question.id} className="mb-8 p-6 bg-white rounded-xl shadow-sm">
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

            <div className="mt-4">{renderQuestionInput(question)}</div>
          </div>
        ))}

        {submitError && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">{submitError}</div>}

        <div className="flex justify-between mt-8">
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
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                Submitting...
              </>
            ) : (
              "Submit Responses"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

