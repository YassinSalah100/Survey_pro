import React from 'react';
import { Question } from '../types/survey';

interface SurveyPreviewProps {
  title: string;
  description: string;
  questions: Question[];
}

const SurveyPreview: React.FC<SurveyPreviewProps> = React.memo(({ title, description, questions }) => {
  const renderQuestionPreview = (question: Question) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  disabled
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="text-sm text-gray-700">{option}</label>
              </div>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label className="text-sm text-gray-700">{option}</label>
              </div>
            ))}
          </div>
        );

      case 'likert_scale':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-center">
              {question.likertScale?.labels.map((label, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    disabled
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'linear_scale':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{question.linearScale?.minLabel}</span>
              <div className="flex-1 mx-4">
                <div className="flex justify-between">
                  {Array.from({ length: question.linearScale?.max! - question.linearScale?.min! + 1 || 0 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        disabled
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-600">{question.linearScale?.min! + i}</span>
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-sm text-gray-600">{question.linearScale?.maxLabel}</span>
            </div>
          </div>
        );

      case 'open_ended':
        return (
          <div className="mt-2">
            <textarea
              disabled
              placeholder="Your answer here..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title || 'Untitled Survey'}</h1>
        {description && <p className="mt-2 text-gray-600">{description}</p>}
      </div>

      <div className="space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-4">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-900">
                {index + 1}. {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </div>
            {question.description && (
              <p className="text-sm text-gray-600">{question.description}</p>
            )}
            {renderQuestionPreview(question)}
          </div>
        ))}
      </div>
    </div>
  );
});

SurveyPreview.displayName = 'SurveyPreview';

export default SurveyPreview;