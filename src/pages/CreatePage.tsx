import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, RotateCcw, Download, Copy, BookOpen, Sparkles, HelpCircle, Cpu, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import CourseSelect from '../components/CourseSelect';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface UploadedFile {
  name: string;
  url: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const systemPrompt = `You are an expert AI education assistant collaborating with a teacher to develop an innovative, AI-integrated experiential learning module. Your role is to be both supportive and constructively critical, helping the teacher create the most effective learning experience possible.

For each step of the module development process:

1. Ask targeted questions (but only 1 at a time) about the teacher's plans
2. Offer specific suggestions and alternatives to consider
3. Provide examples and best practices
4. Help refine and strengthen their ideas
5. Point out potential challenges or areas that might need more development
6. Suggest ways to enhance student engagement and learning outcomes.

Key Areas to Address (Guide the discussion through these topics, but be flexible with the order based on the conversation flow):

1. Course Context & Student Profile
- Ask about: Course level, student background, class size, prerequisites
- Suggest: Ways to accommodate diverse student backgrounds
- Offer: Examples of successful approaches for similar contexts

2. Learning Objectives
- Ask about: Specific knowledge and skills students should gain
- Suggest: Additional objectives that align with the topic
- Offer: Ways to make objectives more measurable and actionable

3. Knowledge Sources
- Ask about: If there are specific knowledge sources that should be referenced by students to guide the AI to advance their learning. If so, ask how they should should be used to guide learning and doing. 
- Suggest: Additional options that align with the topic
- Offer: Ways to make objectives more measurable and actionable

4. AI Integration Strategy
- Start with: The student learning assistant default strategy for the AI is to leverage a constructivist learning pedagogy to help students construct their own knowledge rather than directing it and providing answers. That the goal is to help student understand and apply through their own thinking. Confirm that this pedagogy makes sense for the educator. 
- Ask about: Other ways that AI could be employed --- as a simulated partner (e.g., playing the role of a practitioner), etc...
- Suggest: Innovative ways to incorporate AI meaningfully that could be an asset to the learning examples provided. 
- Offer: Examples of successful AI integration in similar contexts

5. Assessment Strategy
- Start with: Start by saying that the AI default assessment is to assess learning objectives in terms of Bloom's taxonomy of learning and assess demonstration of skills (critical thinking, problem-solving, creativity, and communications); both numerically and with evidence. Confirm that this would be desirable.  Note also that the learning AI facilitation will strive to help the student improve their lowest scores. 
- Ask about: What other  things should be assessed, such as class discussions, proposals, etc...
- Ask whether they would like the AI to develop rubrics for the assessment. 
- Offer: To help develop detailed rubrics for deliverables

6. Experiential Learning Activities
- Ask about: Planned hands-on activities and projects
- Suggest: Ways to make activities more engaging and relevant
- Offer: Additional activity ideas and real-world connections

7. Support & Scaffolding
- Start with: Describe that the default AI facilitation strategy is based upon a constructivist approach whereby students are asked to construct their own knowledge and the ability to apply it and not be provided answers. Confirm that this would be ok for them. 
- Ask about: Other specific support and scaffolding they'd like the AI learning assistant to offer. 
- Offer: Examples of effective scaffolding strategies

8. Special Instructions for AI
- Ask about: If there are module specific instructions, such as using symbolic math or providing visual resources to augment learning. Provide examples.
- Suggest: Additional specific instructions to influence the AI's communication with students.
- Offer: Examples of effective mathematic or visual learning.

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

In communicating with the teacher, if you have a guiding question or comment, or are seeking clarification, ask only one at a time. Wait for a response before offering another. It's very important to not overwhelm the teacher with information.
`;

const CreatePage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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
          { role: 'system', content: systemPrompt },
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises: Promise<UploadedFile | null>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id}/${selectedCourseId}/${fileName}`;

      uploadPromises.push(
        supabase.storage
          .from('knowledge-sources')
          .upload(filePath, file)
          .then(async ({ data, error }) => {
            if (error) {
              console.error('Upload error:', error);
              toast.error(`Failed to upload ${file.name}`);
              return null;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('knowledge-sources')
              .getPublicUrl(data.path);

            return {
              name: file.name,
              url: publicUrl
            };
          })
      );
    }

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result): result is UploadedFile => result !== null);
      
      if (successfulUploads.length > 0) {
        setUploadedFiles(prev => [...prev, ...successfulUploads]);
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
        model: 'gpt-4o',
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
        model: 'gpt-4o',
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
              knowledge_sources: uploadedFiles.map(file => file.url)
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
        navigate('/courses');
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
              <div ref={chatHistoryRef} />
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
              </div>

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

            {/* Knowledge Sources */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-medium mb-4">Knowledge Sources</h3>
              <div className="space-y-4">
                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:text-error"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn-outline py-2 px-4 text-sm"
                  >
                    <Upload className="w-4 h-4 mr-2 inline-block" />
                    {isUploading ? 'Uploading...' : 'Upload Knowledge Sources'}
                  </button>
                  <span className="text-sm text-gray-500">
                    Upload PDFs, documents, or other learning materials
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePage;