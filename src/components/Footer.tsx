import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">BlackIris</h3>
            <p className="text-gray-400 text-sm">
              A secure social platform connecting people with privacy and encryption at the core.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-[#34D399] transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-[#34D399] transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/community-guidelines" className="text-gray-400 hover:text-[#34D399] transition-colors text-sm">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@blackiris.app" className="text-gray-400 hover:text-[#34D399] transition-colors text-sm">
                  Support: support@blackiris.app
                </a>
              </li>
              <li>
                <a href="mailto:report@blackiris.app" className="text-gray-400 hover:text-[#34D399] transition-colors text-sm">
                  Report: report@blackiris.app
                </a>
              </li>
              <li>
                <a href="mailto:security@blackiris.app" className="text-gray-400 hover:text-[#34D399] transition-colors text-sm">
                  Security: security@blackiris.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-gray-400 text-sm">
            <p>&copy; 2026 BlackIris. All rights reserved.</p>
            <p>Secure • Private • Encrypted</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

