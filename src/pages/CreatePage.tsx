import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, RotateCcw, Download, Copy, BookOpen, Sparkles, HelpCircle, Cpu, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import CourseSelect from '../components/CourseSelect';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are an expert AI education assistant collaborating with a teacher to develop an innovative, AI-integrated experiential learning module. Your role is to be both supportive and constructively critical, helping the teacher create the most effective learning experience possible.

For each step of the module development process:

1. Ask targeted questions about the teacher's plans
2. Offer specific suggestions and alternatives to consider
3. Provide examples and best practices
4. Help refine and strengthen their ideas
5. Point out potential challenges or areas that might need more development
6. Suggest ways to enhance student engagement and learning outcomes

Key Areas to Address (Guide the discussion through these topics, but be flexible with the order based on the conversation flow):

1. Course Context & Student Profile
- Ask about: Course level, student background, class size, prerequisites
- Suggest: Ways to accommodate diverse student backgrounds
- Offer: Examples of successful approaches for similar contexts

2. Learning Objectives
- Ask about: Specific knowledge and skills students should gain
- Suggest: Additional objectives that align with the topic
- Offer: Ways to make objectives more measurable and actionable

3. AI Integration Strategy
- Ask about: Planned use of AI tools and technologies
- Suggest: Innovative ways to incorporate AI meaningfully
- Offer: Examples of successful AI integration in similar contexts

4. Assessment Strategy
- Ask about: How learning will be evaluated
- Suggest: Multiple assessment methods (formative and summative)
- Offer: To help develop detailed rubrics for deliverables

5. Experiential Learning Activities
- Ask about: Planned hands-on activities and projects
- Suggest: Ways to make activities more engaging and relevant
- Offer: Additional activity ideas and real-world connections

6. Support & Scaffolding
- Ask about: How students will be supported through challenging concepts
- Suggest: Additional support mechanisms and resources
- Offer: Examples of effective scaffolding strategies

Remember to:
- Be encouraging while also pushing for excellence
- Provide specific, actionable suggestions
- Offer to help develop detailed components (rubrics, activity guides, etc.)
- Maintain focus on student learning outcomes
- Consider practical implementation challenges
- Suggest ways to measure and ensure effectiveness

Your goal is to help the teacher create a learning module that is:
- Pedagogically sound
- Engaging for students
- Practically implementable
- Effectively leverages AI
- Measurably impactful

In communicating with the teacher, if you have a guiding question or comment, or are seeking clarification, ask
only one at a time. Wait for a response before offering another. It's very important to not overwhelm the the teacher with information.`;

const CreatePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [moduleTitle, setModuleTitle] = useState('');
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStart = () => {
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }
    if (!moduleTitle.trim()) {
      toast.error('Please enter a module title');
      return;
    }
    setStarted(true);
    setMessages([
      {
        role: 'assistant',
        content: [
          `Welcome! I'm excited to help you create an engaging and effective learning module titled "${moduleTitle}". Let's start by understanding your vision for this module.\n\n`,
          '1. What are the main concepts or skills you want your students to learn?\n',
          '2. Can you tell me about your students\' current knowledge level and background?\n',
          '3. What challenges have you observed in teaching this content previously?\n\n',
          'I can help you develop:\n',
          '- Clear learning objectives\n',
          '- Engaging activities and assessments\n',
          '- Integration of AI tools\n',
          '- Detailed rubrics\n',
          '- Support materials\n\n',
          'Share your thoughts, and we\'ll work together to create an exceptional learning experience.'
        ].join('')
      }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: input }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      toast.error('Failed to get AI response');
      console.error('AI response error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`File "${file.name}" uploaded successfully`);
    }
  };

  const handleGenerateModule = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }

    if (!moduleTitle.trim()) {
      toast.error('Please enter a module title');
      return;
    }

    setIsLoading(true);
    try {
      // Create a summary of the conversation first
      const summaryCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Create a comprehensive summary of the learning module discussion, organizing the key decisions and specifications into clear sections: Course Context, Learning Objectives, AI Integration, Assessment Strategy, Activities, and Support Mechanisms.'
          },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const summary = summaryCompletion.choices[0]?.message?.content;

      // Generate the full module using the summary
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: `Generate a detailed learning module report with the following sections:
1. Module Overview
2. Learning Context & Student Profile
3. Learning Objectives (using Bloom's Taxonomy)
4. AI Integration Strategy
5. Learning Activities & Timeline
6. Assessment Strategy & Rubrics
7. Support & Scaffolding
8. Implementation Guidelines
9. Success Metrics
10. Required Resources` 
          },
          { 
            role: 'user', 
            content: summary || 'Generate a learning module report' 
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      const moduleContent = completion.choices[0]?.message?.content;
      if (moduleContent) {
        // Save to Supabase
        const { error } = await supabase
          .from('learning_modules')
          .insert([
            {
              user_id: user?.id,
              course_id: selectedCourseId,
              title: moduleTitle,
              description: moduleContent,
            },
          ]);

        if (error) throw error;

        // Create a blob and download it
        const blob = new Blob([moduleContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'learning-module.txt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Learning module generated and saved successfully');
      } else {
        throw new Error('No response from OpenAI');
      }
    } catch (error) {
      toast.error('Failed to generate learning module');
      console.error('Module generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Create Learning Module</h1>
        <p className="text-gray-600 mb-8">
          Let's work together to create an engaging and effective learning module. 
          I'll guide you through the process and help you develop a comprehensive 
          learning experience that achieves your teaching goals.
        </p>

        {!started ? (
          <div className="space-y-6">
            {/* Course Selection */}
            {user && <CourseSelect userId={user.id} onCourseSelect={setSelectedCourseId} />}

            {/* Module Title Input */}
            <div className="space-y-2">
              <label htmlFor="moduleTitle" className="block text-sm font-medium text-gray-700">
                Module Title
              </label>
              <input
                type="text"
                id="moduleTitle"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="Enter module title"
                className="input"
              />
            </div>

            <button
              onClick={handleStart}
              disabled={!selectedCourseId || !moduleTitle.trim()}
              className="btn-primary w-full"
            >
              Start Module Creation
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chat History */}
            <div 
              ref={chatHistoryRef}
              className="bg-white rounded-lg shadow-sm p-4 h-[400px] overflow-y-auto"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'assistant' ? 'pl-4' : 'pl-4'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {message.role === 'assistant' ? 'AI Assistant:' : 'Teacher:'}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="pl-4">
                  <div className="font-bold mb-1">AI Assistant:</div>
                  <div className="animate-pulse">Thinking...</div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Share your thoughts and ideas..."
                  className="w-full h-32 p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  disabled={isLoading}
                />
                <div className="absolute bottom-4 right-4 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-primary"
                    title="Upload file"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </button>
                
                <button
                  type="button"
                  onClick={handleGenerateModule}
                  disabled={isLoading || messages.length < 2}
                  className="btn-secondary flex items-center justify-center px-6"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Learning Module
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePage;