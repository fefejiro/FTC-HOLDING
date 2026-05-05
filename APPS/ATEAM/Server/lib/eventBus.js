/**
 * In-memory event bus for ATEAM
 * Lightweight pub/sub for real-time event distribution
 */

function createEventBus() {
  const subscribers = {};

  function subscribe(eventType, handler) {
    if (!subscribers[eventType]) {
      subscribers[eventType] = [];
    }
    subscribers[eventType].push(handler);

    // Return unsubscribe function
    return () => {
      subscribers[eventType] = subscribers[eventType].filter((h) => h !== handler);
    };
  }

  function publish(eventType, payload) {
    if (!subscribers[eventType]) return;
    for (const handler of subscribers[eventType]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in ${eventType} handler:`, err);
      }
    }
  }

  function getSubscriberCount(eventType) {
    return subscribers[eventType]?.length || 0;
  }

  return {
    subscribe,
    publish,
    getSubscriberCount,
  };
}

export const eventBus = createEventBus();
