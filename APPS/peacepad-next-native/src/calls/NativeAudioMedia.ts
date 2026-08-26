import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  type MediaStream,
} from "react-native-webrtc";
import type { AudioCallSignal } from "../api/CoordinationApi";
import { verifyTurnConfiguration, type PeacePadIceServer } from "./AudioMediaPolicy";

export type NativeAudioMediaCallbacks = Readonly<{
  onIceCandidate: (signal: AudioCallSignal & { kind: "ice" }) => void;
  onConnectionStateChange: (state: string) => void;
}>;

type PeerEventTarget = Readonly<{
  addEventListener: (
    event: "icecandidate" | "connectionstatechange",
    listener: (event: { candidate?: { toJSON: () => { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null } } }) => void,
  ) => void;
}>;

export class NativeAudioMediaSession {
  private constructor(
    private readonly peer: RTCPeerConnection,
    private readonly localStream: MediaStream,
  ) {}

  static async create(
    iceServers: readonly PeacePadIceServer[],
    callbacks: NativeAudioMediaCallbacks,
  ): Promise<NativeAudioMediaSession> {
    const verified = verifyTurnConfiguration(iceServers);
    const peer = new RTCPeerConnection({
      iceServers: verified.iceServers.map((server) => ({
        ...server,
        urls: typeof server.urls === "string" ? server.urls : [...server.urls],
      })),
      iceTransportPolicy: verified.iceTransportPolicy,
    });
    let localStream: MediaStream | undefined;
    try {
      localStream = await mediaDevices.getUserMedia({ audio: true, video: false });
      for (const track of localStream.getAudioTracks()) peer.addTrack(track, localStream);
      const eventTarget = peer as unknown as PeerEventTarget;
      eventTarget.addEventListener("icecandidate", (event) => {
        if (!event.candidate) return;
        const candidate = event.candidate.toJSON();
        callbacks.onIceCandidate({
          kind: "ice",
          payload: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid ?? null,
            sdpMLineIndex: candidate.sdpMLineIndex ?? null,
          },
        });
      });
      eventTarget.addEventListener("connectionstatechange", () => callbacks.onConnectionStateChange(peer.connectionState));
      return new NativeAudioMediaSession(peer, localStream);
    } catch (error) {
      localStream?.getTracks().forEach((track) => track.stop());
      peer.close();
      throw error;
    }
  }

  async createOffer(): Promise<AudioCallSignal & { kind: "offer" }> {
    const offer = await this.peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await this.peer.setLocalDescription(offer);
    if (!offer.sdp) throw new Error("PeacePad could not create a secure audio offer.");
    return { kind: "offer", payload: { sdp: offer.sdp } };
  }

  async acceptOffer(sdp: string): Promise<AudioCallSignal & { kind: "answer" }> {
    await this.peer.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    if (!answer.sdp) throw new Error("PeacePad could not create a secure audio answer.");
    return { kind: "answer", payload: { sdp: answer.sdp } };
  }

  async acceptAnswer(sdp: string): Promise<void> {
    await this.peer.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
  }

  async addIceCandidate(signal: AudioCallSignal & { kind: "ice" }): Promise<void> {
    await this.peer.addIceCandidate(new RTCIceCandidate(signal.payload));
  }

  setMuted(muted: boolean): void {
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  close(): void {
    this.localStream.getTracks().forEach((track) => track.stop());
    this.peer.close();
  }
}
