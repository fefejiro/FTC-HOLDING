// SayWetin Chrome Extension Background Script (MV3)
// Handles tab audio capture and communication with popup

// @ts-expect-error: Chrome extension API
chrome.runtime.onMessage.addListener((message: { type: string }, _sender: unknown, sendResponse: (response: { error?: string; streamId?: string }) => void) => {
  if (message.type === "START_TAB_CAPTURE") {
    // MV3: use getMediaStreamId to obtain a transferable string ID.
    // The popup then passes this ID to getUserMedia via chromeMediaSourceId.
    // @ts-expect-error: Chrome extension API
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      // @ts-expect-error: Chrome extension API
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId: string) => {
        // @ts-expect-error: Chrome extension API
        if (chrome.runtime.lastError || !streamId) {
          // @ts-expect-error: Chrome extension API
          sendResponse({ error: chrome.runtime.lastError?.message || "Failed to get stream ID" });
          return;
        }
        sendResponse({ streamId });
      });
    });
    return true; // keep message channel open for async sendResponse
  }
});
