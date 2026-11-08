"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useBoardSocket } from "./useBoardSocket";
import type { CallParticipant } from "../types/type";

export interface RemotePeer {
  info: CallParticipant;
  stream: MediaStream;
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  // A TURN server is needed when people are behind strict NATs/firewalls (corporate wifi, some mobile carriers).
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn.split(","),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

const CAMERA: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 }, facingMode: "user" };
const MIC: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

/**
 * Mesh WebRTC call for one board (max 6 people, enforced by the server).
 *
 * Every peer connection gets exactly one audio and one video transceiver up front. That
 * makes mute, camera on/off and screen sharing simple `replaceTrack` calls: no
 * renegotiation, no glare.
 */
export function useCall(boardId: string) {
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [audioOn, setAudioOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [sharing, setSharing] = useState(false);

  const joinedRef = useRef(false);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const remoteStreams = useRef(new Map<string, MediaStream>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const audioTrack = useRef<MediaStreamTrack | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrack = useRef<MediaStreamTrack | null>(null);
  const socketRef = useRef<ReturnType<typeof useBoardSocket>["socket"]>(null);

  const outgoingVideo = () => screenTrack.current ?? cameraTrack.current;

  const refreshPreview = () => {
    const tracks = [outgoingVideo()].filter(Boolean) as MediaStreamTrack[];
    setPreview(tracks.length ? new MediaStream(tracks) : null);
  };

  const applyTracks = (pc: RTCPeerConnection) => {
    for (const t of pc.getTransceivers()) {
      const kind = t.receiver.track?.kind;
      if (t.direction === "stopped" || !kind) continue;
      t.direction = "sendrecv";
      void t.sender.replaceTrack(kind === "audio" ? audioTrack.current : outgoingVideo());
    }
  };

  const broadcastState = (audio: boolean, video: boolean) => {
    socketRef.current?.emit("media-state", { boardId, audio, video });
  };

  const closePeer = (id: string) => {
    pcs.current.get(id)?.close();
    pcs.current.delete(id);
    remoteStreams.current.delete(id);
    pendingIce.current.delete(id);
    setPeers(({ [id]: _gone, ...rest }) => rest);
  };

  const createPeer = (remoteId: string, info: CallParticipant, initiator: boolean) => {
    closePeer(remoteId);
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    pcs.current.set(remoteId, pc);
    const stream = new MediaStream();
    remoteStreams.current.set(remoteId, stream);

    if (initiator) {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
      applyTracks(pc);
    }

    pc.ontrack = (e) => {
      stream.getTracks().filter((t) => t.kind === e.track.kind).forEach((t) => stream.removeTrack(t));
      stream.addTrack(e.track);
      setPeers((p) => ({ ...p, [remoteId]: { info: p[remoteId]?.info ?? info, stream } }));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit("ice-candidate", { boardId, to: remoteId, candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        toast.error(`Couldn't connect to ${info.name}`, {
          description: "A network firewall may be blocking the call. A TURN server fixes this.",
        });
      }
    };

    setPeers((p) => ({ ...p, [remoteId]: { info, stream } }));
    return pc;
  };

  const flushIce = async (id: string) => {
    const pc = pcs.current.get(id);
    const queued = pendingIce.current.get(id) ?? [];
    pendingIce.current.delete(id);
    for (const c of queued) await pc?.addIceCandidate(c).catch(() => undefined);
  };

  const stopLocal = () => {
    [audioTrack, cameraTrack, screenTrack].forEach((r) => {
      r.current?.stop();
      r.current = null;
    });
    setPreview(null);
  };

  const reset = useCallback(() => {
    for (const id of [...pcs.current.keys()]) closePeer(id);
    stopLocal();
    joinedRef.current = false;
    setJoined(false);
    setJoining(false);
    setAudioOn(false);
    setVideoOn(false);
    setSharing(false);
    setPeers({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { socket, connected } = useBoardSocket(
    "rtc",
    boardId,
    {
      "rtc-peers": async ({ peers: existing }: { peers: CallParticipant[] }) => {
        joinedRef.current = true;
        setJoined(true);
        setJoining(false);
        for (const p of existing) {
          const pc = createPeer(p.socketId, p, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("offer", { boardId, to: p.socketId, offer });
        }
      },
      "rtc-peer-joined": (p: CallParticipant) => {
        if (!joinedRef.current) return;
        toast(`${p.name} joined the call`);
      },
      offer: async ({ from, offer, peer }: { from: string; offer: RTCSessionDescriptionInit; peer: CallParticipant }) => {
        if (!joinedRef.current) return;
        const pc = createPeer(from, peer, false);
        await pc.setRemoteDescription(offer);
        applyTracks(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("answer", { boardId, to: from, answer });
        await flushIce(from);
      },
      answer: async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
        const pc = pcs.current.get(from);
        if (!pc || pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription(answer);
        await flushIce(from);
      },
      "ice-candidate": async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = pcs.current.get(from);
        if (pc?.remoteDescription) await pc.addIceCandidate(candidate).catch(() => undefined);
        else pendingIce.current.set(from, [...(pendingIce.current.get(from) ?? []), candidate]);
      },
      "rtc-peer-left": ({ socketId }: { socketId: string }) => closePeer(socketId),
      "media-state": ({ socketId, audio, video }: { socketId: string; audio: boolean; video: boolean }) => {
        setPeers((p) => (p[socketId] ? { ...p, [socketId]: { ...p[socketId], info: { ...p[socketId].info, audio, video } } } : p));
      },
      "rtc-error": ({ message }: { message: string }) => {
        toast.error(message);
        reset();
      },
      disconnect: () => {
        if (joinedRef.current) {
          toast.error("Call dropped because the connection was lost");
          reset();
        }
      },
    },
    { autoJoin: false },
  );

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  const join = async () => {
    if (!socket || joining || joined) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Calls need a secure (https) connection and a modern browser");
      return;
    }
    setJoining(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: MIC, video: CAMERA });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: MIC });
        toast("Joined with your microphone only", { description: "Your camera is unavailable or blocked." });
      } catch {
        toast("Joined in listen-only mode", { description: "Allow microphone access to talk." });
      }
    }
    audioTrack.current = stream?.getAudioTracks()[0] ?? null;
    cameraTrack.current = stream?.getVideoTracks()[0] ?? null;
    setAudioOn(!!audioTrack.current);
    setVideoOn(!!cameraTrack.current);
    refreshPreview();
    socket.emit("joinRTC", { boardId, audio: !!audioTrack.current, video: !!cameraTrack.current });
  };

  const leave = useCallback(() => {
    if (joinedRef.current) socketRef.current?.emit("leaveRTC", boardId);
    reset();
  }, [boardId, reset]);

  const toggleAudio = async () => {
    if (!audioTrack.current) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: MIC });
        audioTrack.current = s.getAudioTracks()[0];
        pcs.current.forEach(applyTracks);
      } catch {
        return toast.error("Microphone access is blocked in your browser settings");
      }
      setAudioOn(true);
      return broadcastState(true, videoOn || sharing);
    }
    const next = !audioOn;
    audioTrack.current.enabled = next;
    setAudioOn(next);
    broadcastState(next, videoOn || sharing);
  };

  const toggleVideo = async () => {
    if (videoOn) {
      // Release the camera entirely so its light turns off.
      cameraTrack.current?.stop();
      cameraTrack.current = null;
      setVideoOn(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: CAMERA });
        cameraTrack.current = s.getVideoTracks()[0];
        setVideoOn(true);
      } catch {
        return toast.error("Camera access is blocked or the camera is in use");
      }
    }
    pcs.current.forEach(applyTracks);
    refreshPreview();
    broadcastState(audioOn, !videoOn || sharing);
  };

  const stopShare = useCallback(() => {
    screenTrack.current?.stop();
    screenTrack.current = null;
    setSharing(false);
    pcs.current.forEach(applyTracks);
    refreshPreview();
    broadcastState(audioTrack.current?.enabled ?? false, !!cameraTrack.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleShare = async () => {
    if (sharing) return stopShare();
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: false });
      const track = display.getVideoTracks()[0];
      track.onended = stopShare; // user clicked the browser's "Stop sharing"
      screenTrack.current = track;
      setSharing(true);
      pcs.current.forEach(applyTracks);
      refreshPreview();
      broadcastState(audioOn, true);
    } catch {
      /* user cancelled the picker */
    }
  };

  // Leave cleanly when navigating away from the board.
  useEffect(() => () => leave(), [leave]);

  return {
    joined,
    joining,
    connected,
    peers: Object.entries(peers).map(([id, p]) => ({ id, ...p })),
    preview,
    audioOn,
    videoOn,
    sharing,
    canShare: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleShare,
  };
}
