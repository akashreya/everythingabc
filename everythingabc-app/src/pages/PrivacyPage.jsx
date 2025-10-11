import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, UserCheck, Globe, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

const PrivacyPage = () => {
  const lastUpdated = 'October 10, 2025';

  const principles = [
    {
      icon: Shield,
      title: 'Data Protection',
      description: 'We use industry-standard security measures to protect your information.'
    },
    {
      icon: Eye,
      title: 'Transparency',
      description: 'We clearly explain what data we collect and how we use it.'
    },
    {
      icon: Lock,
      title: 'Minimal Collection',
      description: 'We only collect data that is necessary for our service to function.'
    },
    {
      icon: UserCheck,
      title: 'User Control',
      description: 'You have control over your data and can request deletion at any time.'
    }
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
            <Shield className="w-8 h-8 text-primary dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Privacy Policy
            </h1>
          </div>
          <p className="text-lg text-muted-foreground dark:text-gray-300 mb-4">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Last updated: {lastUpdated}
          </p>
        </section>

        {/* Privacy Principles */}
        <section className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {principles.map((principle, index) => (
              <Card key={index} className="text-center dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 dark:bg-blue-400/20 rounded-full flex items-center justify-center">
                      <principle.icon className="w-6 h-6 text-primary dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    {principle.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Policy Content */}
        <section className="max-w-4xl mx-auto px-4">
          <div className="prose prose-lg max-w-none">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-8">
                <div className="space-y-8 text-gray-700 dark:text-gray-300">

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      1. Information We Collect
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Information You Provide
                        </h3>
                        <p className="leading-relaxed">
                          Currently, EverythingABC does not require user registration or personal information to use our core features. If you contact us through our contact form, we may collect:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Name and email address (when you contact us)</li>
                          <li>Messages or feedback you send to us</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Automatically Collected Information
                        </h3>
                        <p className="leading-relaxed">
                          We may automatically collect certain technical information to improve our service:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Browser type and version</li>
                          <li>Device information (screen size, operating system)</li>
                          <li>Pages visited and time spent on our site</li>
                          <li>General location information (country/region)</li>
                          <li>Dark mode preference (stored locally in your browser)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      2. How We Use Your Information
                    </h2>
                    <p className="leading-relaxed mb-4">
                      We use the information we collect to:
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Provide and improve our educational platform</li>
                      <li>Respond to your questions and support requests</li>
                      <li>Analyze usage patterns to enhance user experience</li>
                      <li>Ensure the security and proper functioning of our service</li>
                      <li>Comply with legal obligations</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      3. Information Sharing and Disclosure
                    </h2>
                    <p className="leading-relaxed mb-4">
                      We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li><strong>Service Providers:</strong> We may share information with trusted service providers who assist us in operating our platform (e.g., hosting, analytics)</li>
                      <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
                      <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, user information may be transferred as part of the business assets</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      4. Data Security
                    </h2>
                    <p className="leading-relaxed">
                      We implement appropriate technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>SSL encryption for data transmission</li>
                      <li>Regular security assessments</li>
                      <li>Access controls and authentication</li>
                      <li>Secure hosting infrastructure</li>
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      5. Cookies and Local Storage
                    </h2>
                    <p className="leading-relaxed mb-4">
                      We use cookies and local storage to enhance your experience:
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                      <li><strong>Preference Cookies:</strong> Remember your settings like dark mode preference</li>
                      <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                    </ul>
                    <p className="leading-relaxed mt-4">
                      You can control cookies through your browser settings, but disabling them may affect the functionality of our service.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      6. Children's Privacy
                    </h2>
                    <p className="leading-relaxed">
                      EverythingABC is designed to be family-friendly and safe for children. We are committed to protecting children's privacy and comply with the Children's Online Privacy Protection Act (COPPA). We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have inadvertently collected such information, please contact us immediately.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      7. Your Rights and Choices
                    </h2>
                    <p className="leading-relaxed mb-4">
                      Depending on your location, you may have certain rights regarding your personal information:
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li><strong>Access:</strong> Request information about the personal data we have about you</li>
                      <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                      <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                      <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                      <li><strong>Objection:</strong> Object to certain processing activities</li>
                    </ul>
                    <p className="leading-relaxed mt-4">
                      To exercise these rights, please contact us using the information provided below.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      8. International Data Transfers
                    </h2>
                    <p className="leading-relaxed">
                      Your information may be processed and stored in countries other than your own. We ensure that such transfers comply with applicable data protection laws and that your information receives adequate protection.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      9. Changes to This Policy
                    </h2>
                    <p className="leading-relaxed">
                      We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated policy on our website and updating the "Last Updated" date. We encourage you to review this policy periodically.
                    </p>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      10. Contact Us
                    </h2>
                    <p className="leading-relaxed mb-4">
                      If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                    </p>
                    <div className="bg-background/50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Mail className="w-4 h-4 text-primary dark:text-blue-400" />
                        <span className="font-medium">Email:</span>
                        <span>privacy@everythingabc.com</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-primary dark:text-blue-400" />
                        <span className="font-medium">Website:</span>
                        <Link to="/contact" className="text-primary dark:text-blue-400 hover:underline">
                          Contact Form
                        </Link>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
};

export default PrivacyPage;