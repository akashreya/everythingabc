import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Scale,
  Shield,
  Users,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";

const TermsPage = () => {
  const lastUpdated = "October 10, 2025";

  const keyPoints = [
    {
      icon: Users,
      title: "Free Access",
      description:
        "Our core educational platform is free to use for all learners.",
    },
    {
      icon: Shield,
      title: "Safe Environment",
      description: "We maintain a family-friendly, educational environment.",
    },
    {
      icon: Scale,
      title: "Fair Use",
      description: "Use our platform responsibly and for educational purposes.",
    },
    {
      icon: AlertTriangle,
      title: "Content Protection",
      description:
        "Our educational content and platform are protected by copyright.",
    },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-300">
      <AppHeader />

      <main className="py-8">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <section className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <FileText className="w-8 h-8 text-primary dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Terms of Service
            </h1>
          </div>
          <p className="text-lg text-muted-foreground dark:text-gray-300 mb-4">
            Please read these terms carefully before using our educational
            platform.
          </p>
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Last updated: {lastUpdated}
          </p>
        </section>

        {/* Key Points */}
        <section className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {keyPoints.map((point, index) => (
              <Card
                key={index}
                className="text-center dark:bg-gray-800 dark:border-gray-700"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 dark:bg-blue-400/20 rounded-full flex items-center justify-center">
                      <point.icon className="w-6 h-6 text-primary dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {point.title}
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    {point.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Terms Content */}
        <section className="max-w-4xl mx-auto px-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-8">
              <div className="space-y-8 text-gray-700 dark:text-gray-300">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    1. Acceptance of Terms
                  </h2>
                  <p className="leading-relaxed">
                    By accessing and using EverythingABC ("the Service"), you
                    accept and agree to be bound by the terms and provision of
                    this agreement. These Terms of Service ("Terms") govern your
                    use of our educational platform, including all content,
                    features, and functionality available through our website.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    2. Description of Service
                  </h2>
                  <p className="leading-relaxed mb-4">
                    EverythingABC is an educational platform designed to help
                    users learn vocabulary through visual, interactive
                    experiences. Our service includes:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      Access to vocabulary learning categories (animals, fruits,
                      vegetables, etc.)
                    </li>
                    <li>Interactive A-Z learning experiences</li>
                    <li>
                      Educational content suitable for K-12 students and ESL
                      learners
                    </li>
                    <li>Free access to core platform features</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    3. Acceptable Use
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Permitted Uses
                      </h3>
                      <p className="leading-relaxed mb-2">
                        You may use our Service for:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Personal educational purposes</li>
                        <li>
                          Classroom instruction and educational activities
                        </li>
                        <li>Homeschooling and family learning</li>
                        <li>Language learning and vocabulary building</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Prohibited Uses
                      </h3>
                      <p className="leading-relaxed mb-2">You agree not to:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          Use the Service for any unlawful purpose or in
                          violation of any laws
                        </li>
                        <li>
                          Attempt to gain unauthorized access to our systems or
                          networks
                        </li>
                        <li>
                          Distribute malware or engage in any activity that
                          could harm our Service
                        </li>
                        <li>
                          Copy, reproduce, or redistribute our content without
                          permission
                        </li>
                        <li>
                          Use automated tools to access or scrape our content
                        </li>
                        <li>
                          Reverse engineer or attempt to extract source code
                        </li>
                        <li>Create derivative works based on our content</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    4. Intellectual Property Rights
                  </h2>
                  <p className="leading-relaxed mb-4">
                    All content, features, and functionality of EverythingABC,
                    including but not limited to text, graphics, logos, images,
                    and software, are owned by EverythingABC or our licensors
                    and are protected by copyright, trademark, and other
                    intellectual property laws.
                  </p>
                  <p className="leading-relaxed">
                    You are granted a limited, non-exclusive, non-transferable
                    license to access and use our Service for personal,
                    educational purposes only. This license does not include the
                    right to modify, distribute, or create derivative works.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    5. User Content and Feedback
                  </h2>
                  <p className="leading-relaxed mb-4">
                    If you provide feedback, suggestions, or other
                    communications to us regarding our Service, you grant us a
                    worldwide, royalty-free, perpetual license to use such
                    feedback for improving our platform.
                  </p>
                  <p className="leading-relaxed">
                    We do not claim ownership of any content you may submit
                    through our contact forms, but you grant us permission to
                    use such content for support and improvement purposes.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    6. Privacy and Data Protection
                  </h2>
                  <p className="leading-relaxed">
                    Your privacy is important to us. Our collection, use, and
                    protection of your information is governed by our Privacy
                    Policy, which is incorporated into these Terms by reference.
                    By using our Service, you consent to the collection and use
                    of information as described in our Privacy Policy.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    7. Children's Use
                  </h2>
                  <p className="leading-relaxed">
                    EverythingABC is designed to be safe and appropriate for
                    children. We comply with the Children's Online Privacy
                    Protection Act (COPPA) and do not knowingly collect personal
                    information from children under 13 without parental consent.
                    Parents and guardians are responsible for supervising their
                    children's use of our Service.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    8. Disclaimers and Limitation of Liability
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Service Disclaimers
                      </h3>
                      <p className="leading-relaxed">
                        Our Service is provided "as is" and "as available"
                        without warranties of any kind. We do not guarantee that
                        our Service will be uninterrupted, error-free, or
                        completely secure.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Educational Disclaimer
                      </h3>
                      <p className="leading-relaxed">
                        While our platform is designed to support learning, we
                        do not guarantee specific educational outcomes. Our
                        Service is a supplementary educational tool and should
                        not be considered a complete educational program.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Limitation of Liability
                      </h3>
                      <p className="leading-relaxed">
                        To the fullest extent permitted by law, EverythingABC
                        shall not be liable for any indirect, incidental,
                        special, or consequential damages resulting from your
                        use of our Service.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    9. Service Availability and Modifications
                  </h2>
                  <p className="leading-relaxed mb-4">
                    We reserve the right to:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      Modify, suspend, or discontinue any part of our Service at
                      any time
                    </li>
                    <li>
                      Update our content and features to improve the learning
                      experience
                    </li>
                    <li>Implement technical maintenance and updates</li>
                    <li>Change these Terms with appropriate notice to users</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    10. Termination
                  </h2>
                  <p className="leading-relaxed">
                    We may terminate or suspend your access to our Service at
                    any time for violation of these Terms or for any other
                    reason. Upon termination, your right to use the Service will
                    cease immediately. All provisions of these Terms that by
                    their nature should survive termination shall survive.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    11. Governing Law and Dispute Resolution
                  </h2>
                  <p className="leading-relaxed">
                    These Terms shall be governed by and construed in accordance
                    with applicable laws. Any disputes arising from these Terms
                    or your use of our Service will be resolved through good
                    faith negotiations, and if necessary, through appropriate
                    legal channels.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    12. Changes to Terms
                  </h2>
                  <p className="leading-relaxed">
                    We may update these Terms from time to time to reflect
                    changes in our Service or legal requirements. We will notify
                    users of material changes by posting the updated Terms on
                    our website. Your continued use of the Service after such
                    changes constitutes acceptance of the new Terms.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    13. Contact Information
                  </h2>
                  <p className="leading-relaxed mb-4">
                    If you have any questions about these Terms of Service,
                    please contact us:
                  </p>
                  <div className="bg-background/50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Mail className="w-4 h-4 text-primary dark:text-blue-400" />
                      <span className="font-medium">Email:</span>
                      <span>hello@everythingabc.com</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-primary dark:text-blue-400" />
                      <span className="font-medium">General Contact:</span>
                      <Link
                        to="/contact"
                        className="text-primary dark:text-blue-400 hover:underline"
                      >
                        Contact Form
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="border-t dark:border-gray-600 pt-6">
                  <p className="text-sm text-muted-foreground dark:text-gray-400 leading-relaxed">
                    By using EverythingABC, you acknowledge that you have read,
                    understood, and agree to be bound by these Terms of Service.
                    Thank you for being part of our educational community!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default TermsPage;
