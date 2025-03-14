// API service to interact with the survey API
export interface Survey {
    id: string
    title: string
    description: string
    isActive: boolean
    createdAt: string
    createdBy: string
    updatedAt?: string
    coverImageUrl?: string
    questions: Question[]
  }
  
  export interface Question {
    id: string
    title: string
    description?: string
    type: string
    options?: string[]
    isRequired: boolean
    imageUrl?: string
  }
  
  // Base API URL
  const API_BASE_URL = "http://survey-pro-api.runasp.net/api"
  
  // Fetch all surveys
  export async function fetchSurveys(): Promise<Survey[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/surveys`)
  
      if (!response.ok) {
        throw new Error(`Error fetching surveys: ${response.statusText}`)
      }
  
      return await response.json()
    } catch (error) {
      console.error("Failed to fetch surveys:", error)
      throw error
    }
  }
  
  