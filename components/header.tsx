'use client';

import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white"
            onClick={closeMobileMenu}
          >
            Alotth.com
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <Link
                    href="/"
                    className="text-sm lg:text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin"
                    className="text-sm lg:text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/project"
                    className="text-sm lg:text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Mindmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/proposals"
                    className="text-sm lg:text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Proposals
                  </Link>
                </li>
              </ul>
            </nav>
            <ThemeToggle />
          </div>

          {/* Mobile Menu Controls */}
          <div className="md:hidden flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <nav>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/project"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Mindmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/proposals"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    Proposals
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
} 