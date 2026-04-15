import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

export function PrivacyPolicy() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-gray-900 border-[#34D399]/20' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#34D399] hover:text-[#34D399]/80"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        <h1 className="text-4xl font-bold text-[#34D399] mb-2">Privacy Policy</h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-8`}>Last Updated: April 2026</p>

        <div className={`space-y-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {/* Introduction */}
          <section>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>1. Introduction</h2>
            <p>
              BlackIris ("we", "us", "our" or "Company") operates the BlackIris website and mobile application. This page informs you of our
              policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated
              with that data.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information Collection and Use</h2>
            <p className="mb-4">We collect several different types of information for various purposes to provide and improve our Service to you.</p>
            
            <h3 className="text-xl font-semibold text-white mb-3">Types of Data Collected:</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><span className="font-semibold">Personal Data:</span> Email address, username, profile picture, bio, location</li>
              <li><span className="font-semibold">Usage Data:</span> Browser type, IP address, pages visited, time spent on pages</li>
              <li><span className="font-semibold">Communication Data:</span> Messages sent through the platform (encrypted)</li>
              <li><span className="font-semibold">Content Data:</span> Posts, reels, comments, and other user-generated content</li>
              <li><span className="font-semibold">Device Data:</span> Device ID, device model, operating system information</li>
            </ul>
          </section>

          {/* Use of Data */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Use of Data</h2>
            <p className="mb-4">BlackIris uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To provide customer support and respond to your requests</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent, and address technical issues and fraudulent activity</li>
              <li>To send promotional communications (which you can opt out from)</li>
            </ul>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic
              storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
              <li>Messages are encrypted using AES encryption with SHA256 verification</li>
              <li>All data is transmitted over secure HTTPS connections</li>
              <li>Row-Level Security (RLS) is implemented in our database</li>
              <li>We do not store unencrypted sensitive data</li>
              <li>Regular security audits and monitoring are performed</li>
            </ul>
          </section>

          {/* GDPR Compliance */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. GDPR Compliance (EU Users)</h2>
            <p className="mb-4">If you are a resident of the European Union, you have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Right to access your personal data</li>
              <li>Right to correct inaccurate data</li>
              <li>Right to delete your data ("right to be forgotten")</li>
              <li>Right to restrict processing of your data</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us at privacy@blackiris.app with your request and we will respond within 30 days.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention</h2>
            <p>
              BlackIris will retain your Personal Data as long as your account is active or as needed to provide you with our services. You can
              delete your account at any time, which will remove your data in accordance with our data retention policies. Please note that we
              may retain some data for backup, archival, and legal purposes.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct
              your browser to refuse all cookies or to alert you when a cookie is being sent.
            </p>
            <p className="mb-4">Types of cookies we use:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><span className="font-semibold">Session Cookies:</span> Stored temporarily and deleted when you close your browser</li>
              <li><span className="font-semibold">Persistent Cookies:</span> Remain on your device for a set period</li>
              <li><span className="font-semibold">Analytics Cookies:</span> Track user behavior and platform usage</li>
            </ul>
          </section>

          {/* Third Parties */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Third-Party Services</h2>
            <p className="mb-4">
              Our Service may contain links to third-party sites that are not operated by us. This Privacy Policy does not apply to third-party
              websites and we are not responsible for their privacy practices. We encourage you to review the privacy policy of every site you visit.
            </p>
            <p className="mb-4">We may use third-party services for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Cloud hosting and storage (Supabase)</li>
              <li>Analytics (Firebase)</li>
              <li>Payment processing</li>
              <li>Email communications</li>
            </ul>
          </section>

          {/* Content Moderation */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Content Moderation and Processing</h2>
            <p>
              To ensure community safety, we employ AI-based content moderation systems that may analyze your messages and content. This
              processing is necessary for our legitimate interests in maintaining a safe platform. Your data is processed according to our
              Community Guidelines and is not shared with third parties for purposes outside of moderation.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this
              page and updating the "Last Updated" date at the top of this Privacy Policy.
            </p>
          </section>

          {/* Contact Us */}
          <section className="bg-gray-900 rounded-lg p-6 border border-[#34D399]/20">
            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="space-y-2 text-[#34D399]">
              <p>Email: <a href="mailto:privacy@blackiris.app" className="hover:underline">privacy@blackiris.app</a></p>
              <p>Support: <a href="mailto:support@blackiris.app" className="hover:underline">support@blackiris.app</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

