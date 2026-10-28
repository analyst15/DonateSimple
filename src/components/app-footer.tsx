export function AppFooter() {
  return (
    <footer className="bg-secondary border-t border-border py-8 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} DonateSimple. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Making a difference, simply.
        </p>
        {/* Add social media links or other footer content here if needed */}
      </div>
    </footer>
  );
}
