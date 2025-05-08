import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import OpenAI from 'openai';
import { Send, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import "../styles/LearningModuleInterface.css";

interface Message {
  role: 'assistant' | 'student';
  content: string;
  imageUrl?: string;
}

interface LearningModule {
  title: string;
  description: string;
  knowledge_sources: string[];
}

interface LearningModuleInterfaceProps {
  moduleId: string;
  initialEvaluation?: any;
  isCompleted?: boolean;
  onCompletionUpdate?: (completed: boolean) => void;
}

// Define the environment variables type for TypeScript
declare global {
  interface ImportMeta {
    env: {
      VITE_OPENAI_API_KEY: string;
      // Add other environment variables as needed
    };
  }
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function LearningModuleInterface({ 
  moduleId, 
  initialEvaluation,
  isCompleted = false,
  onCompletionUpdate 
}: LearningModuleInterfaceProps) {
  const { user } = useAuth();
  const [moduleDetails, setModuleDetails] = useState<LearningModule | null>(null);
  const [knowledgeText, setKnowledgeText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [evaluation, setEvaluation] = useState<any>(initialEvaluation || null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [savedSession, setSavedSession] = useState<boolean>(false);
  const [isModuleCompleted, setIsModuleCompleted] = useState<boolean>(isCompleted);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update local completion state when prop changes
  useEffect(() => {
    setIsModuleCompleted(isCompleted);
  }, [isCompleted]);

  // Warn before unload if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!savedSession && messages.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [savedSession, messages]);

  // Load module & knowledge sources, mark "started"
  useEffect(() => {
    if (!user) return;

    const fetchModuleAndKnowledge = async () => {
      try {
        const { data: mod, error: modErr } = await supabase
          .from('learning_modules')
          .select('title, description, knowledge_sources')
          .eq('learning_module_id', moduleId)
          .single();

        if (modErr) {
          console.error('Error fetching module details:', modErr);
          toast.error(`Error fetching module details: ${modErr.message}`);
          return;
        }
        
        if (!mod) {
          console.error('No module found for ID:', moduleId);
          toast.error('No module found for that learning_module_id');
          return;
        }

        setModuleDetails(mod);

        if (mod.knowledge_sources && mod.knowledge_sources.length > 0) {
          await fetchKnowledgeSources(mod.knowledge_sources);
        } else {
          console.log('No knowledge sources configured for this module');
          setKnowledgeText('');
        }

        if (!isModuleCompleted) {
          await markSessionStarted(user.id, moduleId);
        }
      } catch (err) {
        console.error('Unexpected error in module initialization:', err);
        toast.error('Failed to initialize learning module');
      }
    };

    fetchModuleAndKnowledge();
  }, [moduleId, user, isModuleCompleted]);

  // Helper function to fetch knowledge sources
  const fetchKnowledgeSources = async (sources: string[]) => {
    try {
      const texts = await Promise.all(
        sources.map(async (url) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const r = await fetch(url, { 
              signal: controller.signal,
              headers: {
                'Accept': 'text/plain, text/html, application/json, */*'
              }
            });
            
            clearTimeout(timeoutId);
            
            if (!r.ok) {
              console.error(`Failed to fetch source (${r.status}):`, url);
              return `[Failed to load source: ${url} (${r.status})]`;
            }
            
            const contentType = r.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const json = await r.json();
              return JSON.stringify(json, null, 2);
            } else {
              return await r.text();
            }
          } catch (err) {
            console.error('Error fetching knowledge source:', url, err);
            return `[Failed to load source: ${url} (${err instanceof Error ? err.message : 'Unknown error'})]`;
          }
        })
      );
      
      const validTexts = texts.filter(text => text && !text.startsWith('[Failed to load source:'));
      setKnowledgeText(validTexts.join('\n\n--- SOURCE SEPARATOR ---\n\n'));
      
      if (validTexts.length < texts.length) {
        toast.error(`${texts.length - validTexts.length} knowledge source(s) failed to load`);
      }
    } catch (err) {
      console.error('Error processing knowledge sources:', err);
      toast.error('Failed to process knowledge sources');
      setKnowledgeText('');
    }
  };

  // Helper function to mark session as started
  const markSessionStarted = async (userId: string, learningModuleId: string) => {
    try {
      const { error: upErr } = await supabase
        .from('module_enrollments')
        .upsert(
          { 
            user_id: userId, 
            learning_module_id: learningModuleId, 
            status: 'started'
          },
          { 
            onConflict: 'user_id,learning_module_id'
          }
        );
        
      if (upErr) {
        console.error('Error marking session started:', upErr);
        toast.error('Failed to update session status');
      }
    } catch (err) {
      console.error('Unexpected error marking session started:', err);
      toast.error('Failed to mark session as started');
    }
  };

  // Load saved session or generate overview + starter question
  useEffect(() => {
    if (!moduleDetails || !user) return;
    
    const initializeSession = async () => {
      try {
        const { data, error } = await supabase
          .from('module_enrollments')
          .select('saved_chat_history, saved_evaluation, status')
          .eq('learning_module_id', moduleId)
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching saved session:', error);
          toast.error('Failed to retrieve saved session');
        }
        
        // Set completion status if module is completed
        if (data?.status === 'completed') {
          setIsModuleCompleted(true);
          if (onCompletionUpdate) {
            onCompletionUpdate(true);
          }
        }
        
        // Check if we have a saved session with chat history
        if (data?.status === 'started' && data.saved_chat_history) {
          // Data will be returned as an array due to jsonb type in database
          if (Array.isArray(data.saved_chat_history) && data.saved_chat_history.length > 0) {
            setMessages(data.saved_chat_history);
            if (data.saved_evaluation) setEvaluation(data.saved_evaluation);
            setSavedSession(true);
            toast.success('Resumed your saved session');
          } else {
            console.log('No valid chat history found, generating new session');
            await generateSessionOverview();
          }
        } else {
          await generateSessionOverview();
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        toast.error('Failed to initialize session');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeSession();
  }, [moduleDetails, user, moduleId, onCompletionUpdate]);

  // Helper function to generate session overview
  const generateSessionOverview = async () => {
    try {
      const prompt = `
Create a brief overview (≤70 words) of this learning module: ${moduleDetails?.description}

Then add one starter question to begin the session. The question should assess the student's baseline understanding.

Format your response in Markdown with:
- Overview section with a brief description
- Question section with your starter question

Use **bold** for emphasis where appropriate.
      `.trim();
      
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an AI tutor. Return only the overview and starter question in Markdown format.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });
      
      const overview = resp.choices[0]?.message?.content?.trim() || 'Welcome to this learning module. How would you like to begin?';
      setMessages([{ role: 'assistant', content: overview }]);
    } catch (err) {
      console.error('Error generating overview:', err);
      toast.error('Failed to generate session overview');
      setMessages([{ role: 'assistant', content: 'Welcome to this learning module. How would you like to begin?' }]);
    }
  };

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // ================= EVALUATION FUNCTIONS =================

  // Step 1: Get evaluation based only on the latest exchange
  async function handleEvaluationAfterReply() {
    try {
      // Find the most recent student message
      let studentMessage = null;
      let studentIndex = -1;
      
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'student') {
          studentMessage = messages[i];
          studentIndex = i;
          break;
        }
      }
      
      if (!studentMessage) {
        toast.error("No student message found to evaluate!");
        return null;
      }
      
      // Find the most recent tutor message before this student message
      let tutorMessage = null;
      
      for (let i = studentIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          tutorMessage = messages[i];
          break;
        }
      }
      
      if (!tutorMessage && messages[0] && messages[0].role === 'assistant') {
        tutorMessage = messages[0];
      }
      
      if (!tutorMessage) {
        tutorMessage = { 
          role: 'assistant', 
          content: "Please share your knowledge about this topic." 
        };
      }
      
      // Debug log
      console.log("===== EVALUATION INPUTS =====");
      console.log("Tutor's question:", tutorMessage.content.substring(0, 100) + "...");
      console.log("Student's response:", studentMessage.content.substring(0, 100) + "...");
      
      // Create evaluation prompt
      const prompt = `
You are evaluating a student's response in a learning module about policy frameworks.

## Learning Context
${moduleDetails?.description || 'This module covers policy systems and decision-making processes.'}

## Recent Exchange
Tutor's question: "${tutorMessage.content}"

Student's response: "${studentMessage.content}"

## Evaluation Instructions
Evaluate the student's understanding based on Bloom's Taxonomy. Assign a score from 0-5 for each category, where:
- 0 = No evidence
- 1 = Minimal evidence 
- 2 = Basic evidence
- 3 = Satisfactory evidence
- 4 = Strong evidence
- 5 = Exemplary evidence

For each category, provide specific evidence from the student's response that justifies your score.

Categories to evaluate:
1. Remembering: Ability to recall facts, terms, or concepts
2. Understanding: Ability to explain ideas or concepts
3. Applying: Ability to use information in new situations
4. Analyzing: Ability to draw connections among ideas
5. Evaluating: Ability to justify a position or decision
6. Creating: Ability to produce new or original work

Format your evaluation exactly as follows:

## Evaluation Results
- **Remembering**: x/5  
- **Understanding**: x/5  
- **Applying**: x/5  
- **Analyzing**: x/5  
- **Evaluating**: x/5  
- **Creating**: x/5  

### Evidence
- **Remembering**: [specific evidence from student's response]  
- **Understanding**: [specific evidence from student's response]  
- **Applying**: [specific evidence from student's response]  
- **Analyzing**: [specific evidence from student's response]  
- **Evaluating**: [specific evidence from student's response]  
- **Creating**: [specific evidence from student's response]  

**Average Score:** [average of all scores, with one decimal place]

IMPORTANT: Be fair and generous in your evaluation. If the student demonstrates knowledge at any level, they should receive appropriate credit.`;
      
      // Make the API call for evaluation
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ 
          role: 'system', 
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const evaluationText = resp.choices[0]?.message?.content || '';
      console.log("Raw evaluation result:", evaluationText.substring(0, 100) + "...");
      
      return evaluationText;
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Failed to evaluate response");
      return null;
    }
  }

  // Step 2: Update the evaluation by comparing latest with current
  function extractAverageScore(evaluation: string): number | null {
    if (!evaluation) return null;
    console.log("extractAverageScore input:", evaluation);

    // Match "Average Score" then any non-digit chars, then capture the number
    const match = evaluation.match(/Average Score[^0-9\n]*?(\d+(\.\d+)?)/i);

    console.log("Regex match for average score:", match);
    return match ? parseFloat(match[1]) : null;
  }

  // Helper: persist evaluation text + avg score back to Supabase
  async function saveEvaluationScore(evaluationText: string) {
    if (!user || !moduleId || !evaluationText) return;
    console.log("Saving evaluation text:", evaluationText);

    // 1) extract
    const avgScore = extractAverageScore(evaluationText);
    if (avgScore === null) {
      console.error("Could not extract average score from evaluation");
      return;
    }
    console.log("Extracted average score:", avgScore);

    // 2) update module_enrollments
    const { error: enrollErr } = await supabase
      .from('module_enrollments')
      .update({ saved_evaluation: evaluationText })
      .match({ user_id: user.id, learning_module_id: moduleId });
    if (enrollErr) {
      console.error("Error saving evaluation to enrollment:", enrollErr);
      return;
    }

    // 3) update saved_avg_score on learning_modules
    const { error: moduleError } = await supabase
    .from('module_enrollments')
    .update({ saved_avg_score: avgScore })
    .match({
      user_id: user.id,
      learning_module_id: moduleId
    });
  
    if (moduleError) {
      console.error("Error updating enrollment average score:", moduleError);
      return;
    }

    // 4) (optional) if passing threshold, mark completed
    if (avgScore >= 4.0) {
      const { error: statusErr } = await supabase
        .from('module_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .match({ user_id: user.id, learning_module_id: moduleId });
      if (statusErr) {
        console.error("Error marking completed:", statusErr);
      } else {
        toast.success("🎉 You've completed this module!");
        setIsModuleCompleted(true);
        if (onCompletionUpdate) {
          onCompletionUpdate(true);
        }
      }
    }
  }
  
  async function updateEvaluationWithLatest(latestEvaluation: string) {
    try {
      console.log("Beginning evaluation comparison...");
      
      // If there's no current evaluation, just use the latest one
      if (!evaluation) {
        console.log("No current evaluation, using latest directly");
        setEvaluation(latestEvaluation);
        saveEvaluationScore(latestEvaluation);
        return latestEvaluation;
      }
      
      // Set up a comparison prompt
      const prompt = `
I need to merge two evaluations of a student's work. For each category in Bloom's Taxonomy, I want to keep the HIGHER score and its corresponding evidence.

Current evaluation:
${evaluation}

Latest evaluation:
${latestEvaluation}

Please merge these evaluations following these rules:
1. For each category (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating):
   - Compare the scores from both evaluations
   - Keep the HIGHER score and its corresponding evidence
   - If scores are equal, keep the evidence from the latest evaluation as it's more recent

2. Calculate a new average based on the merged scores

3. Format the result exactly like this:

## Evaluation Results
- **Remembering**: x/5  
- **Understanding**: x/5  
- **Applying**: x/5  
- **Analyzing**: x/5  
- **Evaluating**: x/5  
- **Creating**: x/5  

### Evidence
- **Remembering**: evidence text  
- **Understanding**: evidence text  
- **Applying**: evidence text  
- **Analyzing**: evidence text  
- **Evaluating**: evidence text  
- **Creating**: evidence text  

**Average Score:** [calculated average with one decimal place]`;
      
      // Make the API call for merging evaluations
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ 
          role: 'system', 
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.2,
      });

      const mergedEvaluation = resp.choices[0]?.message?.content || '';
      console.log("Merged evaluation result:", mergedEvaluation.substring(0, 100) + "...");
      
      // Save the merged evaluation
      setEvaluation(mergedEvaluation);
      saveEvaluationScore(mergedEvaluation);
      
      return mergedEvaluation;
    } catch (error) {
      console.error("Error updating evaluation:", error);
      toast.error("Failed to update evaluation");
      return latestEvaluation; // Return the latest evaluation even if merging failed
    }
  }

  const handleSave = async () => {
    if (!user) {
      toast.error("User information missing");
      return;
    }
    console.log("Saving evaluation:", evaluation);
  
    setIsLoading(true);
    try {
      // Only save if not completed
      const status = isModuleCompleted ? "completed" : "started";
      
      const payload = {
        user_id: user.id,
        learning_module_id: moduleId,
        saved_chat_history: messages,
        saved_evaluation: evaluation,
        status: status,
      };
  
      // This await is valid because the containing function is async
      const { data, error } = await supabase
        .from("module_enrollments")
        .upsert(payload, { onConflict: ["user_id", "learning_module_id"] });
  
      if (error) throw error;
  
      setSavedSession(true);
      toast.success("Session saved successfully");
    } catch (err: any) {
      console.error("Error saving session:", err);
      toast.error(err.message || "Failed to save session");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Evaluate button handler
  const handleEvaluate = async () => {
    setIsLoading(true);
    try {
      // First get the latest evaluation
      const latestEvaluation = await handleEvaluationAfterReply();
      
      if (!latestEvaluation) {
        toast.error("Failed to generate evaluation");
        setIsLoading(false);
        return;
      }
      
      // Then update with the latest results
      const finalEvaluation = await updateEvaluationWithLatest(latestEvaluation);
      
      // Show the evaluation modal
      setShowEvaluation(true);
      
      toast.success("Evaluation completed");
    } catch (error) {
      console.error("Evaluation process error:", error);
      toast.error("Evaluation process failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to show debugging information in the chat
  function showDebugInfo() {
    // Find the most recent student and tutor messages
    let studentMessage = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'student') {
        studentMessage = messages[i];
        break;
      }
    }
    
    let tutorMessage = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        tutorMessage = messages[i];
        break;
      }
    }
    
    // Add a debug message to the chat
    const debugMessage: Message = {
      role: 'assistant',
      content: `**DEBUG INFORMATION**

**Current Evaluation:**
${evaluation ? evaluation.substring(0, 200) + "..." : "No evaluation yet"}

**Last Tutor Message:**
${tutorMessage ? tutorMessage.content.substring(0, 200) + "..." : "None"}

**Last Student Message:**
${studentMessage ? studentMessage.content.substring(0, 200) + "..." : "None"}

**Module Details:**
${moduleDetails ? JSON.stringify(moduleDetails, null, 2) : "No module details"}

**Completion Status:**
${isModuleCompleted ? "Completed" : "Not completed"}
`
    };
    
    setMessages(prev => [...prev, debugMessage]);
    
    toast.success("Debug information added to chat");
  }

  const handleDirectEvaluation = async () => {
    // Show loading state
    setIsLoading(true);
    
    try {
      // Find the last student message
      let studentMessage = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'student') {
          studentMessage = messages[i];
          break;
        }
      }
      
      // If no student message found, alert and exit
      if (!studentMessage) {
        alert("No student message found to evaluate!");
        setIsLoading(false);
        return;
      }
      
      // Find the last tutor message
      let tutorMessage = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          tutorMessage = messages[i];
          break;
        }
      }
      
      // If no tutor message found, use a default
      if (!tutorMessage) {
        tutorMessage = { content: "Please share your knowledge about this topic." };
      }
      
      // Create a simple alert to confirm we found messages
      alert(`Found messages to evaluate:
  Student: ${studentMessage.content.substring(0, 100)}...
  Tutor: ${tutorMessage.content.substring(0, 100)}...`);
      
      // Create a direct evaluation prompt
      const prompt = `
  You are evaluating a student's response about policy frameworks.
  
  Tutor's question/prompt: "${tutorMessage.content}"
  
  Student's response: "${studentMessage.content}"
  
  Please evaluate the student's understanding based on Bloom's Taxonomy.
  Be fair and generous - if the student shows any knowledge, they deserve credit.
  
  Format your evaluation exactly like this:
  
  ## Evaluation Results
  - **Remembering**: x/5  
  - **Understanding**: x/5  
  - **Applying**: x/5  
  - **Analyzing**: x/5  
  - **Evaluating**: x/5  
  - **Creating**: x/5  
  
  ### Evidence
  - **Remembering**: evidence text  
  - **Understanding**: evidence text  
  - **Applying**: evidence text  
  - **Analyzing**: evidence text  
  - **Evaluating**: evidence text  
  - **Creating**: evidence text  
  
  **Average Score:** [average]`;
      
      // Make a direct call to OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.3,
          max_tokens: 2000
        })
      });
      
      // Parse the response
      const result = await response.json();
      console.log("OpenAI Response:", result);
      
      // If we have a response, update the evaluation
      if (result.choices && result.choices[0] && result.choices[0].message) {
        const newEvaluation = result.choices[0].message.content;
        
        // Set the evaluation and show it
        setEvaluation(newEvaluation);
        setShowEvaluation(true);
        
        // Add the evaluation as a message in the chat
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**EVALUATION RESULTS**\n\n${newEvaluation}`
        }]);
        
        // Try to save to database but don't worry if it fails
        try {
          const avgScoreMatch = newEvaluation.match(/Average Score:\s*(\d+\.?\d*)/);
          if (avgScoreMatch && avgScoreMatch[1]) {
            const avgScore = parseFloat(avgScoreMatch[1]);
            
            // Just log the score for now
            console.log("Average score:", avgScore);
          }
        } catch (error) {
          console.error("Error processing score:", error);
        }
      } else {
        alert("Error: No valid evaluation returned");
      }
    } catch (error) {
      console.error("Evaluation error:", error);
      alert(`Evaluation error: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle student submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !moduleDetails || isModuleCompleted) return;
    setMessages(m => [...m, { role: 'student', content: input }]);
    setInput('');
    setIsLoading(true);

    try {
      // Generate the tutor's response
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI tutor guiding a student through a learning session.

Consider:
- Lesson plan: ${moduleDetails.description}
- Chat history: ${JSON.stringify(messages)}
- Current evaluation: ${evaluation}
- Available knowledge: ${knowledgeText}

Given the teacher's lesson plan, which defines the learning and skills objectives, experiential goals and deliverables, 
and the pedagogy expected of the AI tutor in guiding student through the learning experience: engage the student to
help them achieve the learning, skills, and experiential goals from the session. Your aim particularly is to help the
student build a deeper level of learning according to Bloom's taxonomy and to answer any question the student poses to
you. If the student asks a question, answering this is your priority. Otherwise, consider that the
current evaluation provides scores in each
of the Bloom's taxonomy category. A student must get an average score of 4 for all categories in order to successfully 
complete a learning module. So, the your response to the student should help them improve their score one category at
time (but beginning with Remembering, then Understanding, then Applying, then Analyzing, then Evaluating, and then Creating. 
Your response should also build upon the Chat history, and reference the Available knowledge provided by the teacher.   

Guidelines:
1. Be concise (≤75 words)
2. Ask only ONE question at a time
3. Ensure understanding before moving on
4. Use Markdown formatting
5. Use **bold** for emphasis
6. Break responses into clear sections`
          },
          { role: 'user', content: input }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const content = resp.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Let\'s try again.';
      setMessages(m => [...m, { role: 'assistant', content }]);
      
    } catch (err) {
      console.error('Error handling submission:', err);
      toast.error('Failed to process your response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Chat History */}
          <div className="h-[60vh] overflow-y-auto p-6">
            <div className="space-y-4">
              {Array.isArray(messages) ? (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        m.role === 'student'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="Generated visualization"
                          className="mt-4 rounded-lg max-w-full"
                        />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p>Loading conversation...</p>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
  
          {/* Input + Controls */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isModuleCompleted ? "Module completed - chat disabled" : "Type your message..."}
                className="flex-1 input"
                disabled={isLoading || isModuleCompleted}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isModuleCompleted}
                className="btn-primary px-4"
              >
                <Send className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={showDebugInfo}
                className="btn-secondary px-4"
              >
                Debug
              </button>
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isLoading || isModuleCompleted}
                className="btn-outline px-4"
              >
                Evaluate
              </button>
              <button
                type="button"
                onClick={() => setShowEvaluation(true)}
                disabled={!evaluation}
                className="btn-outline px-4"
              >
                View Evaluation
              </button>
              {/* ←—— Our Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="btn-secondary px-4"
              >
                Save
              </button>
            </form>
          </div>
        </div>
  
        {/* Evaluation Modal */}
        {showEvaluation && evaluation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Learning Evaluation</h2>
                <button
                  onClick={() => setShowEvaluation(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {evaluation}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}