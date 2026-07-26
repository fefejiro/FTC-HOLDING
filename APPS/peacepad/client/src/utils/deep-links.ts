import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { queryClient } from '@/lib/queryClient';

function sanitizeUrlForLog(urlString: string): string {
  try {
    const url = new URL(urlString);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

function handleDeepLinkUrl(urlString: string): boolean {
  console.log('[DeepLink] Processing URL:', sanitizeUrlForLog(urlString));
  
  try {
    const url = new URL(urlString);
    const scheme = url.protocol.replace(':', '');
    const host = url.host || url.hostname;
    const path = url.pathname;
    
    if (scheme === 'peacepad' && host === 'callback') {
      console.log('[DeepLink] Custom scheme OAuth callback detected');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      window.location.href = '/';
      return true;
    }
    
    // Handle successful mobile OAuth flow with token exchange
    if (scheme === 'peacepad' && host === 'auth-success') {
      const token = url.searchParams.get('token');
      const error = url.searchParams.get('error');
      
      if (error) {
        console.error('[DeepLink] Mobile auth error:', error);
        window.location.href = '/onboarding?error=auth_failed';
        return true;
      }
      
      if (token) {
        console.log('[DeepLink] Mobile auth success - exchanging token for session');
        
        // Exchange the token for a session cookie in the webview context
        fetch('/api/auth/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        })
          .then(async (response) => {
            if (response.ok) {
              console.log('[DeepLink] Token exchange successful - refreshing user data');
              await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
              await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
              window.location.href = '/';
            } else {
              const data = await response.json().catch(() => ({}));
              console.error('[DeepLink] Token exchange failed:', data.message || response.status);
              window.location.href = '/onboarding?error=token_exchange_failed';
            }
          })
          .catch((err) => {
            console.error('[DeepLink] Token exchange network error:', err);
            window.location.href = '/onboarding?error=network_error';
          });
        
        return true;
      }
      
      // No token - fall back to just refreshing (legacy behavior)
      console.log('[DeepLink] Mobile auth success without token - attempting refresh');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      window.location.href = '/';
      return true;
    }
    
    // Handle HTTPS OAuth callbacks from external browser.
    // We load the full callback URL in the WebView so callback handlers can
    // complete auth and establish the in-app session context.
    if (
      path === '/api/callback' ||
      path.startsWith('/api/callback') ||
      path === '/auth/callback' ||
      path.startsWith('/auth/callback') ||
      path === '/auth/mobile-callback' ||
      path.startsWith('/auth/mobile-callback')
    ) {
      console.log('[DeepLink] HTTPS OAuth callback detected - navigating WebView to full callback URL');
      // Navigate to the full callback URL (with code/state params).
      window.location.href = urlString;
      return true;
    }
    
    if (path.startsWith('/join/')) {
      const code = path.split('/join/')[1];
      if (code) {
        console.log('[DeepLink] Partnership join link received');
        localStorage.setItem('pending_join_code', code);
        window.location.href = `/join/${code}`;
        return true;
      }
    }
    
    if (path.startsWith('/call/')) {
      const callId = path.split('/call/')[1];
      if (callId) {
        console.log('[DeepLink] Call ID:', callId);
        window.location.href = `/call/${callId}`;
        return true;
      }
    }
    
    if (path && path !== '/') {
      window.location.href = path;
      return true;
    }
  } catch (error) {
    console.error('[DeepLink] Error processing URL:', error);
  }
  
  return false;
}

export async function setupDeepLinkHandler(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      console.log('[DeepLink] Cold start with URL:', sanitizeUrlForLog(launchUrl.url));
      handleDeepLinkUrl(launchUrl.url);
    }
  } catch (error) {
    console.error('[DeepLink] Error getting launch URL:', error);
  }

  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('[DeepLink] URL opened:', sanitizeUrlForLog(event.url));
    handleDeepLinkUrl(event.url);
  });

  console.log('[DeepLink] Handler initialized');
}

export async function getInitialUrl(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const { url } = await App.getLaunchUrl() || {};
    if (url) {
      console.log('[DeepLink] Launch URL:', sanitizeUrlForLog(url));
      return url;
    }
  } catch (error) {
    console.error('[DeepLink] Error getting launch URL:', error);
  }
  
  return null;
}
