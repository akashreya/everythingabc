import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, HelpCircle, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('https://formspree.io/f/mjkaalzz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          inquiryType: formData.type,
        }),
      });

      if (response.ok) {
        alert('Thank you for your message! We\'ll get back to you soon.');
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          type: 'general'
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Sorry, there was an error sending your message. Please try again or email us directly.');
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Support & Help',
      description: 'Technical support and help using EverythingABC',
      contact: 'support@everythingabc.com',
      note: 'We typically respond within 24 hours'
    },
    {
      icon: MessageSquare,
      title: 'General Inquiries',
      description: 'Business partnerships and general questions',
      contact: 'hello@everythingabc.com',
      note: 'For partnerships and business inquiries'
    }
  ];

  const inquiryTypes = [
    { value: 'general', label: 'General Question' },
    { value: 'support', label: 'Technical Support' },
    { value: 'feedback', label: 'Feedback & Suggestions' },
    { value: 'partnership', label: 'Partnership Inquiry' },
    { value: 'educational', label: 'Educational Institution' },
    { value: 'other', label: 'Other' }
  ];

  const faqs = [
    {
      question: 'Is EverythingABC free to use?',
      answer: 'Yes! Our core vocabulary learning platform is completely free. We plan to offer premium features in the future for advanced functionality.'
    },
    {
      question: 'What age group is EverythingABC designed for?',
      answer: 'Our platform is designed for K-12 students, ESL learners, and anyone looking to build vocabulary skills. Content is age-appropriate and engaging for children aged 3-12.'
    },
    {
      question: 'How can I suggest new categories?',
      answer: 'We love hearing from our community! Use the contact form below to suggest new categories or improvements to existing ones.'
    },
    {
      question: 'Do you offer educational discounts?',
      answer: 'Yes! We offer special programs for schools and educational institutions. Contact us at hello@everythingabc.com for more information.'
    }
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 transition-colors duration-300">
      <AppHeader />

      <main className="py-8">
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-muted-foreground dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We'd love to hear from you! Whether you have questions, feedback, or just want to say hello, we're here to help.
          </p>
        </section>

        {/* Contact Methods */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
            {contactInfo.map((info, index) => (
              <Card key={index} className="text-center dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 dark:bg-blue-400/20 rounded-full flex items-center justify-center">
                      <info.icon className="w-6 h-6 text-primary dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {info.title}
                  </h3>
                  <p className="text-muted-foreground dark:text-gray-400 text-sm mb-3">
                    {info.description}
                  </p>
                  <p className="text-primary dark:text-blue-400 font-medium mb-2">
                    {info.contact}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-gray-500">
                    {info.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-900 dark:text-white">
                Send us a Message
              </CardTitle>
              <p className="text-center text-muted-foreground dark:text-gray-400">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-900 dark:text-white">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your full name"
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-900 dark:text-white">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your.email@example.com"
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-gray-900 dark:text-white">
                    Inquiry Type
                  </Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {inquiryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-gray-900 dark:text-white">
                    Subject *
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Brief description of your inquiry"
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-gray-900 dark:text-white">
                    Message *
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Please provide details about your inquiry..."
                    rows={6}
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full btn-primary">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground dark:text-gray-300">
              Find quick answers to common questions about EverythingABC.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Office Info */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Our Commitment
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <Clock className="w-8 h-8 text-primary dark:text-blue-400 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Quick Response
                  </h4>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    We aim to respond to all inquiries within 24 hours during business days.
                  </p>
                </div>
                <div>
                  <HelpCircle className="w-8 h-8 text-primary dark:text-blue-400 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Helpful Support
                  </h4>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Our team is dedicated to providing helpful, friendly support for all users.
                  </p>
                </div>
                <div>
                  <MessageSquare className="w-8 h-8 text-primary dark:text-blue-400 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Open Communication
                  </h4>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    We value your feedback and use it to continuously improve our platform.
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

export default ContactPage;