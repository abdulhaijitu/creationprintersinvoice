import React, { useEffect, useState, useRef } from 'react';
import { useWalkthrough, WalkthroughStep } from '@/hooks/useWalkthrough';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, SkipForward, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface WalkthroughTooltipProps {
  pageKey: string;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export const WalkthroughTooltip: React.FC<WalkthroughTooltipProps> = ({ pageKey }) => {
  const {
    currentStepData,
    currentStep,
    steps,
    isActive,
    nextStep,
    prevStep,
    skipAll,
  } = useWalkthrough(pageKey);

  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStepData) {
      setPosition(null);
      return;
    }

    const calculatePosition = () => {
      if (currentStepData.targetSelector) {
        const targetElement = document.querySelector(currentStepData.targetSelector);
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const tooltipWidth = 320;
          const tooltipHeight = 200;
          const padding = 16;

          let top = 0;
          let left = 0;
          let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

          switch (currentStepData.position) {
            case 'bottom':
              top = rect.bottom + padding;
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
              arrowPosition = 'top';
              break;
            case 'top':
              top = rect.top - tooltipHeight - padding;
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
              arrowPosition = 'bottom';
              break;
            case 'left':
              top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
              left = rect.left - tooltipWidth - padding;
              arrowPosition = 'right';
              break;
            case 'right':
              top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
              left = rect.right + padding;
              arrowPosition = 'left';
              break;
            default:
              top = rect.bottom + padding;
              left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
              arrowPosition = 'top';
          }

          // Keep within viewport
          left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
          top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

          setPosition({ top, left, arrowPosition });

          // Highlight target element
          targetElement.classList.add('walkthrough-highlight');
          return () => {
            targetElement.classList.remove('walkthrough-highlight');
          };
        }
      } else {
        // Center in viewport if no target
        setPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 160,
          arrowPosition: 'top',
        });
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => {
      window.removeEventListener('resize', calculatePosition);
      // Clean up highlight
      if (currentStepData.targetSelector) {
        const targetElement = document.querySelector(currentStepData.targetSelector);
        targetElement?.classList.remove('walkthrough-highlight');
      }
    };
  }, [isActive, currentStepData]);

  if (!isActive || !currentStepData || !position) {
    return null;
  }

  const tooltipContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-[9998]"
        onClick={skipAll}
      />
      
      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className={cn(
          'fixed z-[9999] w-80 shadow-xl animate-in fade-in-0 zoom-in-95',
          'border-primary/20'
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Arrow */}
        <div
          className={cn(
            'absolute w-3 h-3 bg-card border rotate-45',
            position.arrowPosition === 'top' && '-top-1.5 left-1/2 -translate-x-1/2 border-l border-t',
            position.arrowPosition === 'bottom' && '-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b',
            position.arrowPosition === 'left' && '-left-1.5 top-1/2 -translate-y-1/2 border-l border-b',
            position.arrowPosition === 'right' && '-right-1.5 top-1/2 -translate-y-1/2 border-r border-t',
          )}
        />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{currentStepData.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={skipAll} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          
          {currentStepData.videoUrl && (
            <div className="mt-3">
              {showVideo ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={currentStepData.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title="Tutorial video"
                  />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVideo(true)}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Watch Tutorial
                </Button>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="ghost" size="sm" onClick={skipAll} className="text-muted-foreground">
              <SkipForward className="h-4 w-4 mr-1" />
              Skip
            </Button>
            
            <Button size="sm" onClick={nextStep}>
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );

  return createPortal(tooltipContent, document.body);
};

// CSS for highlight effect (add to index.css)
export const walkthroughStyles = `
.walkthrough-highlight {
  position: relative;
  z-index: 9999;
  box-shadow: 0 0 0 4px hsl(var(--primary) / 0.3), 0 0 0 8px hsl(var(--primary) / 0.1);
  border-radius: 8px;
}
`;
