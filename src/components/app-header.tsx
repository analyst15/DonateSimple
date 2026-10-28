
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  return (
    <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="text-xl sm:text-2xl font-bold">DonateSimple</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Dashboard
            </Link>
          </Button>
          <Button variant="default" asChild>
            <Link href="/#donation-form">
              Donate
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
