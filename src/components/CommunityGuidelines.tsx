import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

export function CommunityGuidelines() {
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

        <h1 className="text-4xl font-bold text-[#34D399] mb-2">Community Guidelines</h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-8`}>Last Updated: April 2026</p>

        <div className={`space-y-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {/* Welcome */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to BlackIris</h2>
            <p>
              BlackIris is a community platform where users can connect, share content, and engage with one another. To ensure a safe, respectful,
              and positive experience for all users, we have established these Community Guidelines. By using BlackIris, you agree to follow these
              guidelines.
            </p>
          </section>

          {/* Be Respectful */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Be Respectful</h2>
            <p className="mb-4">Treat all users with respect and dignity. You may not:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Harass, cyberbully, or threaten other users</li>
              <li>Engage in hate speech or discrimination based on race, ethnicity, religion, gender, sexual orientation, or disability</li>
              <li>Post personal information about others without their consent (doxxing)</li>
              <li>Engage in sustained targeted campaigns against any user</li>
              <li>Use slurs or dehumanizing language toward any group</li>
            </ul>
            <p className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <span className="font-semibold text-red-400">Violation:</span> Repeated violations may result in temporary muting, account suspension, or permanent ban.
            </p>
          </section>

          {/* Safety First */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Safety First</h2>
            <p className="mb-4">Do not post content that promotes or encourages violence, self-harm, or illegal activity:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>No content promoting suicide or self-harm</li>
              <li>No instructions for illegal activities or drugs</li>
              <li>No glorification of violence or dangerous activities</li>
              <li>No encouragement of eating disorders or harmful behaviors</li>
              <li>No exploitation or endangerment of minors</li>
            </ul>
            <p className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <span className="font-semibold text-red-400">Violation:</span> Severe violations will result in immediate permanent ban and possible law enforcement reporting.
            </p>
          </section>

          {/* Authenticity */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Authenticity and Integrity</h2>
            <p className="mb-4">Be honest and authentic in your interactions:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Do not impersonate other users or create fake accounts</li>
              <li>Do not spread misinformation or false information deliberately</li>
              <li>Do not manipulate engagement (buying followers, using bots)</li>
              <li>Do not engage in spam or repetitive posting</li>
              <li>Do not create multiple accounts to evade bans or restrictions</li>
            </ul>
          </section>

          {/* Sexual Content */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Sexual and Abusive Content</h2>
            <p className="mb-4">We do not allow:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Nudity or sexually explicit content</li>
              <li>Non-consensual intimate images</li>
              <li>Sexual solicitation or promotion of sexual services</li>
              <li>Sexually explicit material involving minors (CSAM)</li>
              <li>Revenge porn or intimate images shared without consent</li>
            </ul>
            <p className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <span className="font-semibold text-red-400">Violation:</span> Immediate permanent ban. CSAM violations reported to authorities.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property Rights</h2>
            <p className="mb-4">Respect the intellectual property rights of others:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Do not post copyrighted content without permission</li>
              <li>Do not plagiarize or claim credit for others' work</li>
              <li>Do not distribute pirated software, games, or media</li>
              <li>Respect trademarks and brand names</li>
            </ul>
            <p className="mt-4">
              If your content is flagged for copyright infringement, we may remove it and take action against your account. Repeat offenders face permanent bans.
            </p>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Privacy and Personal Information</h2>
            <p className="mb-4">Protect the privacy of others:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Do not share others' personal information without consent</li>
              <li>Do not share contact information, locations, or identification numbers</li>
              <li>Do not screenshot and share private messages without permission</li>
              <li>Respect others' privacy settings and choices</li>
            </ul>
          </section>

          {/* Commercial Activity */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Commercial Activity and Spam</h2>
            <p className="mb-4">Commercial activity on BlackIris must be transparent and genuine:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Clearly disclose sponsored content and advertisements</li>
              <li>Do not spam or excessively promote products/services</li>
              <li>Do not engage in pyramid schemes or multi-level marketing</li>
              <li>Do not post repetitive or low-quality content</li>
              <li>Follow all applicable laws regarding commerce and advertising</li>
            </ul>
          </section>

          {/* Enforcement */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Enforcement and Consequences</h2>
            <p className="mb-4">BlackIris enforces these guidelines through a tiered approach:</p>
            
            <h3 className="text-lg font-semibold text-white mb-3">First Violation:</h3>
            <p className="ml-4 mb-4">- Warning and content removal</p>
            
            <h3 className="text-lg font-semibold text-white mb-3">Second Violation:</h3>
            <p className="ml-4 mb-4">- 24-hour to 7-day account suspension</p>
            
            <h3 className="text-lg font-semibold text-white mb-3">Third Violation:</h3>
            <p className="ml-4 mb-4">- 30-day suspension or permanent ban</p>
            
            <h3 className="text-lg font-semibold text-white mb-3">Severe Violations:</h3>
            <p className="ml-4">- Immediate permanent ban without warning (violence, CSAM, threats)</p>

            <p className="mt-4">
              Severe violations may also be reported to appropriate law enforcement authorities. We also use AI-powered content moderation to identify
              violations and enforce these guidelines.
            </p>
          </section>

          {/* Appeals */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Appeals</h2>
            <p>
              If you believe your account was suspended or content removed in error, you can appeal by contacting our support team at
              <a href="mailto:support@blackiris.app" className="text-[#34D399] hover:underline"> support@blackiris.app</a> within 30 days of the action.
              We will review your appeal and respond within 5 business days.
            </p>
          </section>

          {/* Reporting */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Reporting Violations</h2>
            <p className="mb-4">
              If you encounter content or behavior that violates these guidelines, please report it immediately. You can:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the report button on any post or user profile</li>
              <li>Send a detailed report to <a href="mailto:report@blackiris.app" className="text-[#34D399] hover:underline">report@blackiris.app</a></li>
              <li>Contact our moderation team through the in-app support feature</li>
            </ul>
            <p className="mt-4">
              All reports are reviewed by our moderation team and appropriate action is taken within 48 hours. We take all reports seriously and
              maintain the confidentiality of reporters.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Guidelines</h2>
            <p>
              BlackIris reserves the right to update these guidelines at any time. We will notify users of significant changes. Continued use of
              BlackIris constitutes acceptance of any new guidelines.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-900 rounded-lg p-6 border border-[#34D399]/20">
            <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
            <p className="mb-4">
              If you have questions about these guidelines or need to report a violation:
            </p>
            <div className="space-y-2 text-[#34D399]">
              <p>Report Violations: <a href="mailto:report@blackiris.app" className="hover:underline">report@blackiris.app</a></p>
              <p>Support & Appeals: <a href="mailto:support@blackiris.app" className="hover:underline">support@blackiris.app</a></p>
              <p>Security Issues: <a href="mailto:security@blackiris.app" className="hover:underline">security@blackiris.app</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

