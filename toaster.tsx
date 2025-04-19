import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useEffect, useState } from "react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            
            {/* Progress bar that appears on toast notification */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-transparent overflow-hidden">
              <ProgressBar 
                id={id}
                isDestructive={variant === "destructive"} 
                duration={5000} // 5 seconds
                onComplete={() => dismiss(id)}
              />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

function ProgressBar({ 
  id, 
  isDestructive, 
  duration, 
  onComplete 
}: { 
  id: string; 
  isDestructive: boolean; 
  duration: number; 
  onComplete: () => void;
}) {
  const [width, setWidth] = useState(100)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setWidth(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          onComplete()
          return 0
        }
        return prev - (100 / (duration / 100))
      })
    }, 100)
    
    return () => clearInterval(timer)
  }, [duration, onComplete])
  
  return (
    <div 
      className={`h-full ${isDestructive ? 'bg-red-500' : 'bg-green-500'}`} 
      style={{ 
        width: `${width}%`, 
        transition: "width 100ms linear",
        position: "absolute",
        left: 0,
        bottom: 0,
        top: 0
      }}
    />
  )
}
