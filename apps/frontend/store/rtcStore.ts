// store/rtcStore.ts
import { create } from 'zustand';

interface RTCState {
  remoteSocketId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  setRemoteSocketId: (id: string | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setPeerConnection: (pc: RTCPeerConnection | null) => void;
}

export const useRTCStore = create<RTCState>((set) => ({
  remoteSocketId: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  setRemoteSocketId: (id) => set({ remoteSocketId: id }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setPeerConnection: (pc) => set({ peerConnection: pc }),
}));
