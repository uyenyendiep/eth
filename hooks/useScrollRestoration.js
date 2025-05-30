import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

export function useScrollRestoration(posts, currentPage) {
  const router = useRouter();

  // Save scroll position và state
  const saveScrollState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const scrollData = {
        scrollY: window.scrollY,
        posts: posts,
        currentPage: currentPage,
        timestamp: Date.now()
      };
      sessionStorage.setItem(
        `scroll_${router.asPath}`,
        JSON.stringify(scrollData)
      );
    }
  }, [posts, currentPage, router.asPath]);

  // Restore scroll position
  const restoreScrollState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem(`scroll_${router.asPath}`);
      if (savedData) {
        const {
          scrollY,
          posts: savedPosts,
          currentPage: savedPage,
          timestamp
        } = JSON.parse(savedData);

        // Check if data is not too old (30 minutes)
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          return { savedPosts, savedPage, scrollY };
        }
        // Clear old data
        sessionStorage.removeItem(`scroll_${router.asPath}`);
      }
    }
    return null;
  }, [router.asPath]);

  // Save state before navigation
  useEffect(() => {
    const handleRouteChangeStart = () => {
      saveScrollState();
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);

    // Also save on beforeunload
    window.addEventListener('beforeunload', saveScrollState);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      window.removeEventListener('beforeunload', saveScrollState);
    };
  }, [router.events, saveScrollState]);

  return { restoreScrollState, saveScrollState };
}
