
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, BarChart, GraduationCap } from "lucide-react";
import scoreLogo from "@/assets/score-logo.svg";
import SEOHead from "@/components/seo/SEOHead";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === "super_admin") {
        navigate("/super-admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  return (
    <>
      <SEOHead
        title="Modern School Management Made Simple"
        description="Streamline school operations with Score. Manage students, teachers, exams, attendance, analytics, and timetables in one modern platform."
        canonical="https://score-app.lovable.app/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Score",
          "applicationCategory": "EducationalApplication",
          "description": "Modern school management system for managing students, teachers, exams, attendance, analytics, and timetables.",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        }}
      />
    <div className="min-h-screen bg-gradient-to-br from-school-light to-white">
      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center">
          <img src={scoreLogo} alt="Score Abby logo" className="h-10 w-10 mr-2" />
          <span className="text-2xl font-bold text-school-primary">SCORE</span>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate("/login")}
            className="bg-school-primary hover:bg-school-secondary text-white"
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section aria-labelledby="hero-heading" className="text-center py-20">
          <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold text-gray-900 mb-8">
            Modern School Management
            <span className="block text-school-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Streamline your school operations with our comprehensive management system. 
            From student enrollment to academic analytics, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-school-primary hover:bg-school-secondary text-white px-8 py-4 text-lg"
            >
              Sign In
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section aria-labelledby="features-heading" className="py-20">
          <h2 id="features-heading" className="text-3xl font-bold text-center text-gray-900 mb-16">
            Everything You Need to Manage Your School
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-school-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-school-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Student Management</h3>
              <p className="text-gray-600">Comprehensive student profiles, enrollment, and academic tracking</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-school-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-school-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Academic Management</h3>
              <p className="text-gray-600">Grades, exams, attendance, and curriculum management</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-school-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart className="w-8 h-8 text-school-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics & Reports</h3>
              <p className="text-gray-600">Detailed insights and reports on student performance</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-school-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-school-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Teacher Portal</h3>
              <p className="text-gray-600">Tools for teachers to manage classes and track progress</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section aria-labelledby="cta-heading" className="text-center py-20 bg-school-primary/5 rounded-2xl">
          <h2 id="cta-heading" className="text-3xl font-bold text-gray-900 mb-8">
            Ready to Transform Your School Management?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of schools already using our platform to streamline their operations
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-school-primary hover:bg-school-secondary text-white px-12 py-4 text-lg"
          >
            Sign In to Get Started
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={scoreLogo} alt="Score Abby logo" className="h-10 w-10 mr-2" />
            <span className="text-2xl font-bold">SCORE</span>
          </div>
          <p className="text-gray-400">
            Empowering education through technology
          </p>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Index;
