'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

interface RTCProps {
  boardId: string;
}

interface SignalData {
  from: string;
  to: string;
  boardId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export default function RTC({ boardId }: RTCProps) {
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const { socket } = useSocket<SignalData>({
    namespace: 'rtc',
    boardId,

    onConnect: (socket) => {
      socket.emit('joinRTC', boardId);

      socket.on('user-joined', ({ socketId }: { socketId: string }) => {
        console.log('User joined:', socketId);
        setRemoteSocketId(socketId);
      });
    },

    onCustomEvent: () => {
      if (!socket) return;

      socket.on('offer', async ({ from, offer }: SignalData) => {
        setRemoteSocketId(from);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const newPeer = createPeerConnection(stream, from, socket);
          peerRef.current = newPeer;

          await newPeer.setRemoteDescription(new RTCSessionDescription(offer!));
          const answer = await newPeer.createAnswer();
          await newPeer.setLocalDescription(answer);
          socket.emit('answer', { boardId, to: from, answer });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      });

      socket.on('answer', async ({ answer }: SignalData) => {
        try {
          await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer!));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      });

      socket.on('ice-candidate', async ({ candidate }: SignalData) => {
        try {
          await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate!));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      });
    },
  });

  const createPeerConnection = (
    stream: MediaStream,
    targetSocketId: string,
    socket: ReturnType<typeof useSocket>['socket']
  ) => {
    const newPeer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach((track) => newPeer.addTrack(track, stream));

    newPeer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          boardId,
          to: targetSocketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    newPeer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return newPeer;
  };

  const handleCallUser = async () => {
    if (!socket || !remoteSocketId) {
      alert('No peer to call yet.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const newPeer = createPeerConnection(stream, remoteSocketId, socket);
      peerRef.current = newPeer;

      const offer = await newPeer.createOffer();
      await newPeer.setLocalDescription(offer);
      socket.emit('offer', { boardId, to: remoteSocketId, offer });
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  useEffect(() => {
    return () => {
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Video Call</h2>
      <div className="flex space-x-4">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-1/2 rounded" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2 rounded" />
      </div>
      <button
        onClick={handleCallUser}
        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
      >
        Start Call
      </button>
    </div>
  );
}
