import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsiOS() {
  const [isiOS, setIsiOS] = React.useState<boolean>(false)
  
  React.useEffect(() => {
    // Detecting iOS devices based on user agent
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isIPhone = /iPhone/i.test(userAgent);
    const isIPad = /iPad/i.test(userAgent) || 
                  (/Macintosh/i.test(userAgent) && 'ontouchend' in document); // Detect iPad with iPadOS
    const isIPod = /iPod/i.test(userAgent);
    
    setIsiOS(isIPhone || isIPad || isIPod);
  }, []);
  
  return isiOS;
}
