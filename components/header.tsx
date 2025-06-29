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
    <header className="bg-background border-b border-border shadow-sm">
      <div className="px-6 sm:px-4 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-lg sm:text-xl font-semibold text-foreground hover:text-primary transition-colors"
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
                    className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin"
                    className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Admin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/project"
                    className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Mindmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/proposals"
                    className="text-sm lg:text-base text-muted-foreground hover:text-foreground transition-colors"
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
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border">
            <nav>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Admin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/project"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Mindmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/proposals"
                    onClick={closeMobileMenu}
                    className="block py-2 text-base text-muted-foreground hover:text-foreground transition-colors"
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