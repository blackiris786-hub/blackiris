import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

export function Terms() {
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

        <h1 className="text-4xl font-bold text-[#34D399] mb-2">Terms of Service</h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-8`}>Last Updated: April 2026</p>

        <div className={`space-y-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {/* Section 1 */}
          <section>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>1. Acceptance of Terms</h2>
            <p>
              By accessing and using BlackIris ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on BlackIris for personal,
              non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className={`list-disc list-inside space-y-2 ml-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on BlackIris</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Violating any applicable laws or regulations related to access to or use of BlackIris</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Disclaimer</h2>
            <p>
              The materials on BlackIris are provided on an 'as is' basis. BlackIris makes no warranties, expressed or implied, and hereby
              disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability,
              fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Limitations</h2>
            <p>
              In no event shall BlackIris or its suppliers be liable for any damages (including, without limitation, damages for loss of data
              or profit, or due to business interruption) arising out of the use or inability to use the materials on BlackIris, even if
              BlackIris or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on BlackIris could include technical, typographical, or photographic errors. BlackIris does not warrant
              that any of the materials on the website are accurate, complete, or current. BlackIris may make changes to the materials contained
              on the website at any time without notice.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Materials and Content</h2>
            <p>
              The materials on BlackIris are protected by copyright law and international treaties. You may not transmit, distribute, or store
              content that is abusive, threatening, obscene, defamatory, or otherwise objectionable material. User-generated content remains the
              property of the user but you grant BlackIris a license to use it for platform operations.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Limitations of Liability</h2>
            <p>
              In no case shall BlackIris, its directors, officers, other team members, or anyone else involved in the creation, production, or
              delivery of BlackIris be liable for any direct, indirect, incidental, special, exemplary, or consequential damages arising out of
              related to this platform, its use or the content provided herein.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. User Accounts</h2>
            <p className="mb-4">
              If you create an account on BlackIris, you are responsible for maintaining the confidentiality of account information and password
              and are fully responsible for all activities that occur under your account. You must:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Immediately notify BlackIris of any unauthorized uses of your account</li>
              <li>Ensure you log off from your account at the end of each session</li>
              <li>Not share your account or password with others</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Prohibited Conduct</h2>
            <p className="mb-4">You agree not to use BlackIris to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Harass, threaten, or intimidate any other user</li>
              <li>Post false, inaccurate, or misleading information</li>
              <li>Upload viruses or malicious code</li>
              <li>Spam, phish, or attempt to gain unauthorized access</li>
              <li>Violate any local, state, national, or international law</li>
              <li>Infringe upon intellectual property rights</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
            <p>
              BlackIris may terminate or suspend your account and access immediately, without prior notice or liability, if you breach any of
              the Terms of Service. Upon termination, your right to use BlackIris will immediately cease.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Modifications to Terms</h2>
            <p>
              BlackIris reserves the right, at its sole discretion, to modify or replace these Terms at any time. If a revision is material,
              we will try to provide at least 30 days notice prior to any new terms taking effect. Your continued use of the platform following
              the posting of revised Terms means that you accept and agree to the changes.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
            <p>
              These Terms and Conditions are governed by and construed in accordance with the laws of the jurisdiction in which BlackIris
              operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-900 rounded-lg p-6 border border-[#34D399]/20">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please <a href="mailto:support@blackiris.app" className="text-[#34D399] hover:underline">contact us</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

