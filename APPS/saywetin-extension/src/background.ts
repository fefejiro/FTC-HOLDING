// SayWetin Chrome Extension Background Script (MV3)
// Handles tab audio capture and communication with popup

// @ts-ignore: Chrome extension API
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === "START_TAB_CAPTURE") {
    // @ts-ignore: Chrome extension API
    chrome.tabCapture.capture({
      audio: true,
      video: false,
    }, (stream: any) => {
      // @ts-ignore: Chrome extension API
      if (chrome.runtime.lastError || !stream) {
        // @ts-ignore: Chrome extension API
        sendResponse({ error: chrome.runtime.lastError?.message || "Failed to capture tab audio" });
        return;
      }
      // Create a port to the popup
      // @ts-ignore: Chrome extension API
      const [port] = chrome.runtime?.ports || [];
      if (port) {
        port.postMessage({ type: "AUDIO_STREAM", streamId: stream.id });
      }
      // For MV3, we can't send the stream directly, but we can notify success
      sendResponse({ success: true });
    });
    return true;
  }
});
