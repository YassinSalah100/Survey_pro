import axios from "axios"

const API_BASE_URL = process.env.API_URL || "http://survey-pro-api.runasp.net/api"

// Define interfaces for API requests and responses based on the actual API response
export interface ApiQuestion {
  id?: string
  title: string
  description: string
  type: number // API uses numeric types
  options: string[]
  isRequired: boolean
  imageUrl?: string | null
}

export interface ApiSurvey {
  id?: string
  title: string
  description: string
  categories?: string[]
  numberOfQuestions?: number
  estimatedCompletionTime?: string
  coverImageUrl?: string
  createdBy?: string
  questions: ApiQuestion[]
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface QuestionResponse {
  questionId: string
  answer?: string
  selectedOptions?: string[]
}

export interface SurveyResponseDto {
  surveyId: string
  responses: QuestionResponse[]
}

// Map question types between UI and API
export const questionTypeMap = {
  // API to UI
  0: "likert_scale",
  1: "multiple_choice",
  2: "open_ended",
  3: "checkbox",
  4: "linear_scale",

  // UI to API
  likert_scale: 0,
  multiple_choice: 1,
  open_ended: 2,
  checkbox: 3,
  linear_scale: 4,
}

// API service functions
export const SurveyApi = {
  // Get all surveys
  getAllSurveys: async (): Promise<ApiSurvey[]> => {
    const token = localStorage.getItem("auth_token")
    try {
      const response = await axios.get(`${API_BASE_URL}/surveys`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      // The API returns an array of surveys
      return response.data
    } catch (error) {
      console.error("Error fetching surveys:", error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.")
      }
      throw new Error("Failed to fetch surveys")
    }
  },

  // Get survey by ID
  getSurveyById: async (id: string): Promise<ApiSurvey> => {
    const token = localStorage.getItem("auth_token")
    const response = await axios.get(`${API_BASE_URL}/surveys/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return response.data
  },

  // Create a new survey
  createSurvey: async (formData: FormData): Promise<ApiSurvey> => {
    // Get the token from localStorage
    const token = localStorage.getItem("auth_token")
    if (!token) {
      throw new Error("Authentication required")
    }

    const response = await axios.post(`${API_BASE_URL}/surveys`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data
  },

  // Update a survey
  updateSurvey: async (id: string, formData: FormData): Promise<void> => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      throw new Error("Authentication required")
    }

    await axios.put(`${API_BASE_URL}/surveys/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    })
  },

  // Delete a survey
  deleteSurvey: async (id: string): Promise<void> => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      throw new Error("Authentication required")
    }

    await axios.delete(`${API_BASE_URL}/surveys/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  // Respond to a survey
  respondToSurvey: async (surveyId: string, responses: QuestionResponse[]): Promise<any> => {
    const token = localStorage.getItem("auth_token")
    const responseData = {
      responses: responses,
    }

    const response = await axios.post(`${API_BASE_URL}/surveys/${surveyId}/respond`, responseData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return response.data
  },

  // Get all responses for a survey
  getSurveyResponses: async (surveyId: string): Promise<any[]> => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      throw new Error("Authentication required")
    }

    const response = await axios.get(`${API_BASE_URL}/surveys/${surveyId}/responses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
}

export default SurveyApi

