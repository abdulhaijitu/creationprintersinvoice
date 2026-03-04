import React from 'react';
import { isDynamicImportError, guardedReload } from '@/lib/lazyLoadRecovery';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary that catches chunk/dynamic-import failures and shows
 * a friendly retry UI instead of a blank screen.
 */
export class ChunkLoadBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State | null {
    if (isDynamicImportError(error)) {
      return { hasError: true };
    }
    return null; // let other errors propagate
  }

  componentDidCatch(error: Error) {
    if (!isDynamicImportError(error)) {
      throw error; // re-throw non-chunk errors
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    guardedReload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-foreground">
            পেজ লোড করতে সমস্যা হয়েছে
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            ইন্টারনেট সংযোগ বা ক্যাশ সমস্যার কারণে পেজটি লোড হয়নি। নিচের
            বাটনে ক্লিক করে আবার চেষ্টা করুন।
          </p>

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              আবার চেষ্টা করুন
            </button>
            <button
              onClick={this.handleReload}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
            >
              পেজ রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
