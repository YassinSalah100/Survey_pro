export type QuestionType = 'multiple_choice' | 'likert_scale' | 'open_ended' | 'checkbox' | 'linear_scale' | 'date' | 'time';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  description?: string;
  options?: string[];
  likertScale?: {
    min: number;
    max: number;
    labels: string[];
  };
  linearScale?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
}

export interface SurveySettings {
  requireSignIn: boolean;
  shuffleQuestions: boolean;
  showProgressBar: boolean;
  allowReview: boolean;
}

export interface Survey {
  title: string;
  description: string;
  category: string;
  settings: SurveySettings;
  questions: Question[];
}