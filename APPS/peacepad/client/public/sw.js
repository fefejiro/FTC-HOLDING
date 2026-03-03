// Dynamic cache versioning - updates automatically on each deployment
const CACHE_VERSION = 'peacepad-' + new Date().toISOString().split('T')[0];
const CACHE_NAME = `${CACHE_VERSION}-v${Date.now()}`;
const CRISIS_CACHE = 'peacepad-crisis-v1'; // Persistent cache for emergency resources

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Critical Ontario crisis resources - ALWAYS cached for offline emergency access
// These are life-saving numbers for domestic violence victims
const ONTARIO_CRISIS_RESOURCES = [
  {
    organization: "Assaulted Women's Helpline (24/7)",
    phone: "1-866-863-0511",
    type: "crisis",
    genderFocus: "female",
    services: ["24/7 crisis line", "Safety planning", "Emotional support"],
    isVerified: true,
  },
  {
    organization: "Man Up Against Violence (Male Survivor Support)",
    phone: "1-855-626-8778",
    type: "crisis",
    genderFocus: "male",
    services: ["24/7 crisis line", "Male survivor support", "Referrals"],
    isVerified: true,
  },
  {
    organization: "Talk 4 Healing (Indigenous Support)",
    phone: "1-855-554-4325",
    type: "crisis",
    genderFocus: "all",
    services: ["24/7 crisis line", "Indigenous support", "Cultural counseling"],
    isVerified: true,
  },
  {
    organization: "Trans Lifeline",
    phone: "1-877-330-6366",
    type: "crisis",
    genderFocus: "lgbtq+",
    services: ["24/7 crisis line", "Trans peer support", "Safe space"],
    isVerified: true,
  },
  {
    organization: "Ontario Police (Emergency)",
    phone: "911",
    type: "crisis",
    genderFocus: "all",
    services: ["Emergency response", "Immediate danger"],
    isVerified: true,
  },
  {
    organization: "Kids Help Phone",
    phone: "1-800-668-6868",
    type: "crisis",
    genderFocus: "all",
    services: ["24/7 crisis line", "Youth support", "Text support"],
    isVerified: true,
  },
];

// Install event - cache static assets AND critical crisis resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing with offline crisis support...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      // Cache critical crisis resources for offline emergency access
      caches.open(CRISIS_CACHE).then((cache) => {
        const crisisData = {
          resources: ONTARIO_CRISIS_RESOURCES,
          cachedAt: new Date().toISOString(),
          offline: true,
        };
        const response = new Response(JSON.stringify(crisisData), {
          headers: { 'Content-Type': 'application/json' }
        });
        return cache.put('/offline-crisis-numbers', response);
      }),
    ]).then(() => {
      console.log('[ServiceWorker] Crisis resources cached for offline access');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches (but keep crisis cache)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep crisis cache persistent, delete other old caches
          if (cacheName.startsWith('peacepad-') && 
              cacheName !== CACHE_NAME && 
              cacheName !== CRISIS_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify all clients that a new version is available
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_AVAILABLE',
            version: CACHE_NAME
          });
        });
      });
      return self.clients.claim();
    })
  );
});

// Fetch event - Network-first for HTML/JS/CSS, cache-first for images
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle offline crisis resources request (critical for DV victims)
  if (url.pathname === '/offline-crisis-numbers' || url.pathname === '/api/offline-crisis-numbers') {
    event.respondWith(
      caches.match('/offline-crisis-numbers', { cacheName: CRISIS_CACHE })
        .then((response) => {
          if (response) {
            console.log('[ServiceWorker] Serving offline crisis numbers from cache');
            return response;
          }
          // Fallback if cache miss
          const fallbackData = {
            resources: ONTARIO_CRISIS_RESOURCES,
            cachedAt: new Date().toISOString(),
            offline: true,
            fallback: true,
          };
          return new Response(JSON.stringify(fallbackData), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Skip websocket
  if (url.pathname.startsWith('/ws')) {
    return;
  }

  // Cache certain read-only API endpoints for offline access (stale-while-revalidate)
  const CACHEABLE_API_PATHS = [
    '/api/auth/user',
    '/api/partnerships',
    '/api/children',
    '/api/user/stats',
  ];

  const isCacheableApi = CACHEABLE_API_PATHS.some(path => url.pathname === path || url.pathname.startsWith(path + '/'));
  
  if (url.pathname.startsWith('/api')) {
    if (isCacheableApi) {
      // Stale-while-revalidate for cacheable APIs
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          
          // Fetch fresh data in background
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => null);

          // Return cached immediately if available, otherwise wait for network
          if (cachedResponse) {
            // Update in background
            fetchPromise;
            return cachedResponse;
          }
          
          // No cache, wait for network
          const networkResponse = await fetchPromise;
          if (networkResponse) {
            return networkResponse;
          }
          
          // Offline and no cache - return offline indicator
          return new Response(JSON.stringify({ offline: true, message: 'You are offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
      return;
    }
    
    // Skip non-cacheable API calls
    return;
  }

  // For HTML documents: Network-first (always get fresh version)
  // For JS/CSS: Cache-first with network update (faster PWA cold starts on iPhone)
  if (
    request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/'
  ) {
    // HTML: Network-first strategy for fresh content
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }
  
  // JS/CSS: Cache-first for instant PWA loads (critical for iPhone performance)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // Return cached version immediately for instant load
        if (cached) {
          // Update cache in background for next time
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {}); // Silent fail for background update
          
          return cached;
        }
        
        // First time: fetch and cache
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Cache-first for images and static assets (faster loading)
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // Return offline fallback for documents
        if (request.destination === 'document') {
          return caches.match('/').then((doc) => {
            return doc || new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        }
        // Non-document requests must still resolve to a Response object.
        // Returning undefined here causes: "Failed to convert value to 'Response'".
        return Response.error();
      })
  );
});

// Handle messages from clients (e.g., SKIP_WAITING for updates)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING message, activating now');
    self.skipWaiting();
  }
});

// Push notification support for incoming calls
self.addEventListener('push', (event) => {
  let data = {
    title: 'PeacePad',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Enhanced notification options for calls and Conch sessions
  const isIncomingCall = data.data && data.data.type === 'incoming-call';
  const isConchInvitation = data.data && data.data.type === 'conch_session_invitation';
  
  // Quick action buttons for incoming calls
  const callActions = isIncomingCall ? [
    { action: 'answer', title: '📞 Answer' },
    { action: 'decline', title: '✖️ Decline' }
  ] : [];
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    // Match in-app ringtone vibration pattern: double-ring, repeated twice for urgency
    vibrate: isIncomingCall ? [400, 200, 400, 2000, 400, 200, 400, 2000] : [200, 100, 200],
    tag: data.tag || 'peacepad-notification',
    data: data.data || {},
    actions: (Array.isArray(data.actions) && data.actions.length > 0) ? data.actions : callActions,
    // Keep call and Conch notifications visible until user responds
    requireInteraction: isIncomingCall || isConchInvitation,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const isIncomingCall = notificationData.type === 'incoming-call';
  const isConchInvitation = notificationData.type === 'conch_session_invitation';
  
  // Handle Conch session invitation actions
  if (isConchInvitation && event.action) {
    if (event.action === 'accept_conch') {
      // Open app and navigate to Conch Mode to join session
      const conchUrl = `/conch-mode?sessionId=${notificationData.sessionId}&action=join`;
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((windowClients) => {
            // Focus existing window or open new one
            for (let i = 0; i < windowClients.length; i++) {
              const client = windowClients[i];
              if ('focus' in client) {
                client.postMessage({
                  type: 'join-conch-session',
                  sessionId: notificationData.sessionId,
                  partnershipId: notificationData.partnershipId,
                  initiatorName: notificationData.initiatorName
                });
                return client.focus();
              }
            }
            if (clients.openWindow) {
              return clients.openWindow(conchUrl);
            }
          })
      );
      return;
    } else if (event.action === 'decline_conch') {
      // Send decline signal to backend - wrap in waitUntil to ensure fetch completes
      event.waitUntil(
        fetch(`/api/conch-sessions/${notificationData.sessionId}/decline`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Declined from notification' })
        }).catch(err => console.error('Failed to decline Conch session:', err))
      );
      return;
    }
  }
  
  // Handle quick action buttons for calls
  if (isIncomingCall && event.action) {
    if (event.action === 'answer') {
      // Open app and auto-answer the call
      const callUrl = `/messages?callId=${notificationData.callId}&action=answer`;
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((windowClients) => {
            // Focus existing window or open new one
            for (let i = 0; i < windowClients.length; i++) {
              const client = windowClients[i];
              if ('focus' in client) {
                client.postMessage({
                  type: 'answer-call',
                  callId: notificationData.callId,
                  callerId: notificationData.callerId,
                  callType: notificationData.callType
                });
                return client.focus();
              }
            }
            if (clients.openWindow) {
              return clients.openWindow(callUrl);
            }
          })
      );
      return;
    } else if (event.action === 'decline') {
      // Send decline signal to backend - wrap in waitUntil to ensure fetch completes
      event.waitUntil(
        fetch(`/api/calls/${notificationData.callId}/decline`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Declined from notification' })
        }).catch(err => console.error('Failed to decline call:', err))
      );
      return;
    }
  }

  // Default behavior: open the app
  const urlToOpen = notificationData.url || '/messages';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
            // If it's a call notification, send message to open call dialog
            if (isIncomingCall) {
              client.postMessage({
                type: 'incoming-call',
                callId: notificationData.callId,
                callerId: notificationData.callerId,
                callType: notificationData.callType
              });
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
