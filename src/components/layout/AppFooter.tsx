const AppFooter = () => {
  return (
    <footer className="border-t border-border/50 bg-background/50 py-4 px-4 md:px-6">
      <p className="text-center text-xs text-muted-foreground">
        © Copyright 2025. Design and develop by{" "}
        <a
          href="http://creationtechbd.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-sm transition-colors"
        >
          Creation Tech
        </a>
      </p>
    </footer>
  );
};

export default AppFooter;
