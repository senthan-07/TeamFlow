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
  const [peer, setPeer] = useState<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { socket, connected } = useSocket<SignalData>({
    namespace: 'rtc',
    boardId,
    onConnect: async (socket) => {
      socket.emit('joinRTC', boardId);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const newPeer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      stream.getTracks().forEach((track) => newPeer.addTrack(track, stream));

      newPeer.onicecandidate = (event) => {
        if (event.candidate && remoteSocketId && socket) {
          socket.emit('ice-candidate', {
            boardId,
            to: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      newPeer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      setPeer(newPeer);
    },

    onCustomEvent: (event, handler) => {
        if (!socket) return;

        socket.on('user-joined', ({ socketId }: { socketId: string }) => {
            console.log('User joined:', socketId);
            setRemoteSocketId(socketId); // Set socket ID of peer to call
        });

        socket.on('offer', async ({ from, offer }: SignalData) => {
            setRemoteSocketId(from);
            await peer?.setRemoteDescription(new RTCSessionDescription(offer!));
            const answer = await peer!.createAnswer();
            await peer!.setLocalDescription(answer);
            socket.emit('answer', { boardId, to: from, answer });
        });

        socket.on('answer', async ({ answer }: SignalData) => {
            await peer?.setRemoteDescription(new RTCSessionDescription(answer!));
        });

        socket.on('ice-candidate', async ({ candidate }: SignalData) => {
            await peer?.addIceCandidate(new RTCIceCandidate(candidate!));
        });
        },

  });

    const handleCallUser = async () => {
        if (!socket || !peer || !remoteSocketId) {
            alert('No peer to call yet.');
            return;
        }
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('offer', { boardId, to: remoteSocketId, offer });
    };


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
