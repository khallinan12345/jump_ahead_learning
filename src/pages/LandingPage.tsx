import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, Cpu, MessageSquare, Users } from 'lucide-react';

const LandingPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (heroRef.current) {
        heroRef.current.style.backgroundPositionY = `${scrollPosition * 0.5}px`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <div 
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center bg-gradient-to-r from-primary/90 to-accent/90 bg-cover bg-center text-white"
        style={{ backgroundImage: 'url(https://images.pexels.com/photos/8199562/pexels-photo-8199562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)' }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="container relative z-10 py-20">
          <div className="max-w-4xl">
            <h1 className="text-5xl font-bold mb-6 animate-fade-in-up">
              Jump Ahead Learning
            </h1>
            <div className="space-y-4 animate-fade-in-up animation-delay-200">
              <p className="text-xl opacity-90">
                Enabling teachers to easily develop AI integrating courses and learning/experiential modules for students to engage with and learn.
              </p>
              <p className="text-xl opacity-90">
                We measure learning and skill growth and accelerate learning to empower any young person anywhere.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 mt-8 animate-fade-in-up animation-delay-400">
              <Link to="/auth?signup=true" className="btn-primary">
                Get Started Free
              </Link>
              <Link to="/auth" className="btn bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Empowering Education Through AI</h2>
            <p className="text-xl text-gray-600">
              Our platform combines powerful AI tools with intuitive module building capabilities to transform learning experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card p-8 transition-all duration-300 hover:shadow-md"
              >
                <div className="bg-primary/10 p-3 rounded-lg w-fit mb-6">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">How Module Creation Works</h2>
            <p className="text-xl text-gray-600">
              Create personalized AI learning experiences in three simple steps
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-24 h-[60%] w-0.5 bg-gray-200 -translate-x-1/2" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="card p-8 h-full flex flex-col items-center text-center">
                    <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-6 relative z-10">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">What Our Module Creators Say</h2>
            <p className="text-xl text-gray-600">
              Join educators who are transforming AI learning through personalized modules
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Create Your AI Module?</h2>
            <p className="text-xl mb-8 opacity-90">
              Start building personalized AI education modules today with our intuitive creation tools and comprehensive platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/auth?signup=true" className="btn bg-white text-primary hover:bg-white/90">
                Start Creating Now <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

// Data
const features = [
  {
    icon: BookOpen,
    title: "Module Builder",
    description: "Create structured learning paths with our intuitive module builder that lets you organize content effectively."
  },
  {
    icon: Cpu,
    title: "AI Integration",
    description: "Easily integrate AI components into your modules for personalized learning experiences and adaptive content."
  },
  {
    icon: MessageSquare,
    title: "Interactive Elements",
    description: "Add interactive exercises, quizzes, and AI-powered assessments to engage learners effectively."
  },
  {
    icon: Award,
    title: "Progress Tracking",
    description: "Monitor learner progress with detailed analytics and adjust your modules for optimal learning outcomes."
  },
  {
    icon: Users,
    title: "Collaboration Tools",
    description: "Work with other educators to create and improve modules while sharing best practices."
  },
  {
    icon: ArrowRight,
    title: "Easy Distribution",
    description: "Share your modules seamlessly with learners and track their engagement and progress."
  }
];

const steps = [
  {
    title: "Design Your Module",
    description: "Use our intuitive tools to structure your AI education content and create engaging learning paths."
  },
  {
    title: "Add AI Components",
    description: "Integrate interactive AI elements and personalization features to enhance the learning experience."
  },
  {
    title: "Share and Monitor",
    description: "Distribute your modules to learners and track their progress with detailed analytics."
  }
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "AI Education Specialist",
    avatar: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=120",
    quote: "This platform has revolutionized how I create AI learning content. The personalization features are exactly what modern education needs."
  },
  {
    name: "Michael Chen",
    role: "Course Creator",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120",
    quote: "The module builder is incredibly intuitive, and the AI integration features help me create truly adaptive learning experiences."
  },
  {
    name: "Priya Patel",
    role: "Education Director",
    avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=120",
    quote: "Being able to personalize AI education at scale has transformed how our institution approaches technical training."
  }
];

export default LandingPage;