import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, RotateCcw, Download, Copy, BookOpen, Sparkles, HelpCircle, Cpu } from 'lucide-react';

const AiFreePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "Hi there! I'm your AI learning assistant. Ask me anything about artificial intelligence, machine learning, or data science. I'm here to help you with explanations, code examples, and more.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    
    // Simulate AI response
    simulateResponse(userMessage.content);
  };

  const simulateResponse = (userMessage: string) => {
    setIsProcessing(true);
    
    // Simulate API call delay
    setTimeout(() => {
      let responseContent = '';
      
      // Simple pattern matching to create somewhat relevant responses
      if (userMessage.toLowerCase().includes('neural network')) {
        responseContent = "Neural networks are computing systems inspired by the biological neural networks that constitute animal brains. They consist of artificial neurons or nodes connected together like the neurons in a brain. Modern neural networks are typically organized in layers, and they're at the heart of deep learning algorithms.\n\nWould you like me to explain a specific type of neural network in more detail?";
      } else if (userMessage.toLowerCase().includes('machine learning')) {
        responseContent = "Machine learning is a subset of artificial intelligence that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. It focuses on the development of algorithms that can access data and use it to learn for themselves.\n\nThe learning process begins with observations or data, such as examples, direct experience, or instruction, in order to look for patterns in data and make better decisions in the future based on the examples provided.";
      } else if (userMessage.toLowerCase().includes('code') || userMessage.toLowerCase().includes('example')) {
        responseContent = "Here's a simple example of a neural network using Python and TensorFlow:\n\n```python\nimport tensorflow as tf\nfrom tensorflow import keras\n\n# Create a simple sequential model\nmodel = keras.Sequential([\n    keras.layers.Dense(128, activation='relu', input_shape=(784,)),\n    keras.layers.Dropout(0.2),\n    keras.layers.Dense(10, activation='softmax')\n])\n\n# Compile the model\nmodel.compile(\n    optimizer='adam',\n    loss='sparse_categorical_crossentropy',\n    metrics=['accuracy']\n)\n```\n\nThis code creates a basic neural network with one hidden layer that could be used for image classification tasks like MNIST digit recognition.";
      } else {
        responseContent = "That's an interesting question about " + userMessage.split(' ').slice(0, 3).join(' ') + "... \n\nAI and machine learning are rapidly evolving fields with numerous applications across industries. The key to understanding these technologies is recognizing that they learn from data to make predictions or decisions without being explicitly programmed for specific tasks.\n\nIs there a particular aspect of this topic you'd like me to elaborate on?";
      }

      const aiResponse = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 1500);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi there! I'm your AI learning assistant. Ask me anything about artificial intelligence, machine learning, or data science. I'm here to help you with explanations, code examples, and more.",
        timestamp: new Date()
      }
    ]);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background flex flex-col">
      <div className="container py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-lg mr-3">
                  <Cpu className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-semibold text-lg">AI Playground</h1>
                  <p className="text-sm text-gray-500">Ask anything about AI and machine learning</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleClearChat}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Clear chat"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Download chat"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-3xl rounded-lg p-4 ${
                    message.role === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                        <Sparkles className="w-3 h-3 text-primary" />
                      </div>
                      <span className="font-medium">AI Assistant</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none">
                    {message.content.split('\n').map((paragraph: string, i: number) => {
                      if (paragraph.includes('```')) {
                        const parts = message.content.split(/```(\w+)?\n|\n```/g);
                        return parts.map((part: string, j: number) => {
                          if (j % 2 === 1) {
                            // This is code
                            return (
                              <div key={j} className="relative">
                                <pre className="bg-gray-800 text-white p-3 rounded-md font-mono text-sm my-2 overflow-x-auto">
                                  <code>{parts[j+1]}</code>
                                </pre>
                                <button 
                                  className="absolute top-2 right-2 p-1 bg-gray-700 rounded-md text-gray-300 hover:text-white"
                                  onClick={() => navigator.clipboard.writeText(parts[j+1])}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          } else if (part && j !== 0 && j !== parts.length - 1) {
                            // Regular text between code blocks
                            return <p key={j}>{part}</p>;
                          }
                          return null;
                        });
                      }
                      return paragraph ? <p key={i}>{paragraph}</p> : <br key={i} />;
                    })}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-white/80">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4 max-w-3xl">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                    <span className="font-medium">AI Assistant</span>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '600ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {showSuggestions && (
            <div className="px-4 py-3 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested questions:</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "Explain how neural networks work",
                  "What's the difference between AI and machine learning?",
                  "Show me a basic Python code example for linear regression",
                  "How can I start learning machine learning?"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-800 transition-colors flex items-center"
                  >
                    <BookOpen className="w-4 h-4 mr-2 text-primary" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex">
              <div className="relative flex-1">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Ask something about AI..."
                  className="w-full py-3 px-4 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none h-12 max-h-32 overflow-auto"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  style={{ minHeight: '48px' }}
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={isProcessing || !inputValue.trim()}
                className="ml-2 btn-primary h-12 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="text-xs text-gray-500 mt-2 px-2">
              Press Enter to send, Shift+Enter for a new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiFreePage;