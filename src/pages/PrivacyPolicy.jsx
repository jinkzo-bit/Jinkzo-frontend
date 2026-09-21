import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Lock, Eye, Server, RefreshCw, Mail } from 'lucide-react';

function PolicySection({ icon, title, children }) {
  return (
    <div className="bg-surface rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 border border-line shadow-xs transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-primary flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/30">
          {icon}
        </div>
        <h2 className="text-lg sm:text-xl font-display font-bold text-main">
          {title}
        </h2>
      </div>
      <div className="text-sm sm:text-base text-muted leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Privacy Policy | Jinkzo';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pb-32 pt-2 sm:pt-4 animate-fade-in">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-line text-main hover:bg-gray-50 dark:hover:bg-gray-800/60 font-medium text-sm transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-muted" />
          <span>Back</span>
        </button>

        <Link
          to="/"
          className="text-xs sm:text-sm font-semibold text-primary hover:underline"
        >
          Return to Home
        </Link>
      </div>

      {/* Hero Header */}
      <div className="text-center bg-surface rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 border border-line shadow-xs mb-6 sm:mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-purple-100 dark:bg-purple-950/50 text-primary mx-auto flex items-center justify-center mb-4 sm:mb-5 shadow-inner">
          <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-main tracking-tight mb-2">
          Your Privacy Matters
        </h1>
        <p className="text-xs sm:text-sm text-muted font-medium">
          Effective Date: July 2025 · Jinkzo Food Delivery & Ride Booking
        </p>
      </div>

      {/* Intro Box */}
      <div className="bg-surface rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 border border-line shadow-xs mb-6 text-sm sm:text-base text-muted leading-relaxed">
        At Jinkzo, we are committed to protecting your personal data and ensuring transparency in how we collect, use, and share information. This Privacy Policy is crafted in full compliance with the Google Play Store Developer Program Policies and applicable data protection laws.
      </div>

      {/* Policy Sections */}
      <div className="space-y-6">
        <PolicySection
          icon={<Eye className="w-5 h-5 text-primary" />}
          title="1. Information We Collect"
        >
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold text-main">Account Information:</span> Name, email address, phone number, and encrypted password.
            </li>
            <li>
              <span className="font-semibold text-main">Location Data:</span> We collect precise and approximate location data when the app is running in the foreground to facilitate food delivery tracking, rider navigation, and distance estimation.
            </li>
            <li>
              <span className="font-semibold text-main">Transaction & Order History:</span> Details of your food orders, ride bookings, payment methods, and digital wallet balance.
            </li>
            <li>
              <span className="font-semibold text-main">KYC & Partner Documents:</span> For Restaurant Partners and Delivery Riders, we collect identity documents (e.g., Driving License, GSTIN) solely for verification and compliance.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<Server className="w-5 h-5 text-blue-500" />}
          title="2. How We Use Your Data"
        >
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold text-main">Providing Services:</span> To process your orders, dispatch delivery riders, and enable real-time GPS tracking.
            </li>
            <li>
              <span className="font-semibold text-main">Account Management:</span> To manage your digital wallet, addresses, and authentication sessions.
            </li>
            <li>
              <span className="font-semibold text-main">Safety & Security:</span> To prevent fraud, verify driver identity, and maintain platform security.
            </li>
            <li>
              <span className="font-semibold text-main">Communication:</span> To send transactional updates, order status notifications, and customer support replies.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<Lock className="w-5 h-5 text-amber-500" />}
          title="3. Data Sharing & Disclosure"
        >
          <p className="mb-3">
            We never sell your personal information to third parties. We share data only when strictly necessary:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold text-main">With Delivery Riders & Restaurants:</span> Your name, delivery address, and phone number are shared with the specific restaurant and rider fulfilling your active order.
            </li>
            <li>
              <span className="font-semibold text-main">With Service Providers:</span> Cloud hosting, secure payment gateways, and mapping services required for app functionality.
            </li>
            <li>
              <span className="font-semibold text-main">Legal Compliance:</span> When required by law or to respond to valid legal process.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<RefreshCw className="w-5 h-5 text-emerald-500" />}
          title="4. Data Retention & Account Deletion"
        >
          <p className="mb-3">
            In compliance with Google Play Account Deletion requirements, you have total control over your data:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-semibold text-main">In-App Deletion:</span> You can permanently delete your account and all associated data directly within the app by navigating to Profile → Delete Account.
            </li>
            <li>
              <span className="font-semibold text-main">Data Erasure:</span> Upon verification of your deletion request, your profile, addresses, wallet history, and authentication tokens are permanently erased. Transaction records required for financial accounting are anonymized.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
          title="5. Contact Us & User Rights"
        >
          <p className="mb-3">
            You have the right to access, correct, or request the deletion of your personal data at any time. If you have any questions or concerns regarding this Privacy Policy, please contact our Data Protection Officer at:
          </p>
          <div className="p-4 rounded-xl bg-base border border-line text-sm space-y-2">
            <p className="flex items-center gap-2">
              <span className="select-none">📧</span>
              <span className="font-semibold text-main">Email:</span>
              <a
                href="mailto:privacy@Jinkzo.com"
                className="text-primary hover:underline font-medium"
              >
                privacy@Jinkzo.com
              </a>
            </p>
            <p className="flex items-start gap-2">
              <span className="select-none">🏢</span>
              <span>
                <span className="font-semibold text-main">Address:</span> Jinkzo Technologies Pvt. Ltd., Bengaluru, Karnataka, India.
              </span>
            </p>
          </div>
        </PolicySection>
      </div>

      {/* Footer Return Link */}
      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover font-semibold text-sm transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jinkzo Home</span>
        </Link>
      </div>
    </div>
  );
}
