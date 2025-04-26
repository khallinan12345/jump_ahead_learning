import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import OpenAI from 'openai';
import { Send, X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

interface Message {
  role: 'assistant' | 'student';
  content: string;
}

interface LearningModuleInterfaceProps {
  moduleId: string;
}

const systemPrompt = `You are an AI tutor helping a student learn. Your role is to:
1. Engage in a Socratic dialogue to help the student understand concepts
2. Ask probing questions to assess understanding
3. Provide clear explanations and examples
4. Encourage critical thinking
5. Adapt your responses based on the student's demonstrated knowledge level
6. Focus on improving areas where the student shows weakness in their evaluation

Remember to:
- Be encouraging and supportive
- Break down complex concepts
- Use real-world examples
- Check for understanding frequently
- Provide constructive feedback`;

const evaluationPrompt = `Based on our conversation, evaluate the student's understanding in the following areas on a scale of 1-5. For each area, provide specific evidence from the conversation to justify the score:

1. Conceptual Understanding
2. Critical Thinking
3. Application of Knowledge
4. Communication Skills
5. Overall Engagement

For each area receiving a score below 4, provide specific suggestions for improvement.

Format your response as a JSON object with the following structure:
{
  "scores": {
    "conceptual_understanding": number,
    "critical_thinking": number,
    "application": number,
    "communication": number,
    "engagement": number
  },
  "average_score": number,
  "evidence": {
    "conceptual_understanding": string[],
    "critical_thinking": string[],
    "application": string[],
    "communication": string[],
    "engagement": string[]
  },
  "feedback": {
    "strengths": string[],
    "areas_for_improvement": {
      "area": string,
      "score": number,
      "suggestions": string[]
    }[]
  }
}`;

const LearningModuleInterface = ({ moduleId }: LearningModuleInterfaceProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadExistingSession();
  }, [user, moduleId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadExistingSession = async () => {
    try {
      const { data, error } = await supabase
        .from('module_enrollments')
        .select('saved_chat_history, saved_evaluation, saved_avg_score, status')
        .eq('learning_module_id', moduleId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        if (data.saved_chat_history) {
          setMessages(data.saved_chat_history);
        }
        if (data.saved_evaluation) {
          setEvaluation(data.saved_evaluation);
        }
        if (data.status === 'completed') {
          toast.success('You have completed this module!');
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load previous session');
    }
  };

  const saveSession = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('module_enrollments')
        .update({
          saved_chat_history: messages,
          saved_evaluation: evaluation,
          saved_avg_score: evaluation?.scores?.average_score || null,
          status: evaluation?.average_score >= 4 ? 'completed' : 'started'
        })
        .eq('learning_module_id', moduleId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Session saved successfully');
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const performAssessment = async () => {
    try {
      setIsLoading(true);
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: evaluationPrompt },
          { role: 'user', content: JSON.stringify(messages) }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          const evaluationData = JSON.parse(response);
          setEvaluation(evaluationData);
          setShowEvaluation(true);

          // Save the evaluation
          if (user) {
            await saveSession();
          }
        } catch (error) {
          console.error('Error parsing evaluation:', error);
          toast.error('Failed to parse evaluation data');
        }
      }
    } catch (error) {
      console.error('Error performing assessment:', error);
      toast.error('Failed to perform assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'student' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role === 'student' ? 'user' : 'assistant',
            content: msg.content
          })),
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const assistantMessage = { role: 'assistant' as const, content: response };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Chat Interface */}
          <div className="h-[60vh] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'student' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'student'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 input"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="btn-primary px-4"
                >
                  <Send className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={saveSession}
                  disabled={isSaving || messages.length === 0}
                  className="btn-secondary px-4"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={performAssessment}
                  disabled={isLoading || messages.length === 0}
                  className="btn-outline px-4"
                >
                  Evaluate
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Evaluation Modal */}
        {showEvaluation && evaluation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold">Learning Evaluation</h2>
                <button
                  onClick={() => setShowEvaluation(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-8">
                  {/* Scores */}
                  <div>
                    <h3 className="font-semibold mb-4">Scores & Evidence</h3>
                    <div className="space-y-4">
                      {Object.entries(evaluation.scores).map(([key, score]) => (
                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-gray-700 font-medium">
                              {key.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </div>
                            <div className="text-2xl font-bold text-primary">{score}/5</div>
                          </div>
                          {evaluation.evidence[key] && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-600 mb-1">Evidence:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {evaluation.evidence[key].map((evidence: string, i: number) => (
                                  <li key={i} className="text-sm text-gray-600">{evidence}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Average Score */}
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Average</span>
                      <span className="text-2xl font-bold text-primary">
                        {evaluation.average_score.toFixed(1)}/5
                      </span>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div>
                    <h3 className="font-semibold mb-3">Strengths</h3>
                    <div className="bg-success/5 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-2">
                        {evaluation.feedback.strengths.map((strength: string, index: number) => (
                          <li key={index} className="text-gray-700">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Areas for Improvement */}
                  {evaluation.feedback.areas_for_improvement.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Areas for Improvement</h3>
                      <div className="space-y-4">
                        {evaluation.feedback.areas_for_improvement.map((area: any, index: number) => (
                          <div key={index} className="bg-warning/5 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800">{area.area}</span>
                              <span className="text-sm px-2 py-1 bg-warning/10 rounded text-warning font-medium">
                                Score: {area.score}/5
                              </span>
                            </div>
                            <ul className="list-disc list-inside space-y-2">
                              {area.suggestions.map((suggestion: string, i: number) => (
                                <li key={i} className="text-gray-700 text-sm">{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t">
                <button
                  onClick={() => setShowEvaluation(false)}
                  className="btn-primary w-full"
                >
                  Close Evaluation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningModuleInterface;