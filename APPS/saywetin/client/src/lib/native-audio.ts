import { VoiceRecorder } from 'capacitor-voice-recorder';

export function isNativeApp(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' && 
         (window as any).Capacitor.isNativePlatform();
}

export async function hasRecordingPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  
  try {
    console.log('[SAYWETIN-NATIVE] Checking audio recording permission...');
    const result = await VoiceRecorder.hasAudioRecordingPermission();
    console.log('[SAYWETIN-NATIVE] Permission check result:', result.value);
    return result.value;
  } catch (error) {
    console.error('[SAYWETIN-NATIVE] Permission check failed:', error);
    return false;
  }
}

export async function requestRecordingPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  
  try {
    console.log('[SAYWETIN-NATIVE] Requesting audio recording permission...');
    const result = await VoiceRecorder.requestAudioRecordingPermission();
    console.log('[SAYWETIN-NATIVE] Permission request result:', result.value);
    return result.value;
  } catch (error) {
    console.error('[SAYWETIN-NATIVE] Permission request failed:', error);
    return false;
  }
}

export async function startNativeRecording(): Promise<boolean> {
  if (!isNativeApp()) return false;
  
  try {
    console.log('[SAYWETIN-NATIVE] Starting native recording...');
    const result = await VoiceRecorder.startRecording();
    console.log('[SAYWETIN-NATIVE] Recording started:', result.value);
    return result.value;
  } catch (error) {
    console.error('[SAYWETIN-NATIVE] Failed to start native recording:', error);
    return false;
  }
}

export async function stopNativeRecording(): Promise<Blob | null> {
  if (!isNativeApp()) return null;
  
  try {
    console.log('[SAYWETIN-NATIVE] Stopping native recording...');
    const result = await VoiceRecorder.stopRecording();
    
    console.log('[SAYWETIN-NATIVE] Stop result - has value:', !!result.value);
    console.log('[SAYWETIN-NATIVE] Stop result - has base64:', !!(result.value && result.value.recordDataBase64));
    console.log('[SAYWETIN-NATIVE] Stop result - mimeType:', result.value?.mimeType);
    console.log('[SAYWETIN-NATIVE] Stop result - msDuration:', result.value?.msDuration);
    
    if (result.value && result.value.recordDataBase64) {
      const base64Data = result.value.recordDataBase64;
      let mimeType = result.value.mimeType || 'audio/aac';
      
      if (mimeType === 'audio/webm' || mimeType === 'audio/webm;codecs=opus') {
        mimeType = 'audio/aac';
      }
      
      console.log('[SAYWETIN-NATIVE] Base64 data length:', base64Data.length);
      console.log('[SAYWETIN-NATIVE] Raw mimeType from recorder:', result.value.mimeType);
      console.log('[SAYWETIN-NATIVE] Using mimeType:', mimeType);
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      console.log('[SAYWETIN-NATIVE] Created blob - size:', blob.size, 'bytes, type:', blob.type);
      return blob;
    }
    
    console.warn('[SAYWETIN-NATIVE] No recording data returned from VoiceRecorder');
    return null;
  } catch (error) {
    console.error('[SAYWETIN-NATIVE] Failed to stop native recording:', error);
    return null;
  }
}

export async function cancelNativeRecording(): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    console.log('[SAYWETIN-NATIVE] Canceling native recording...');
    await VoiceRecorder.stopRecording();
  } catch {
  }
}
