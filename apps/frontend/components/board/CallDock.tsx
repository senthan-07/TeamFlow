"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { cn } from "../../lib/utils";
import type { User } from "../../types/type";
import type { useCall } from "../../hooks/useCall";
import Avatar from "../ui/Avatar";

/** True while the stream's audio is above a speaking threshold. */
function useSpeaking(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  // Remote streams gain tracks in place, so depend on the count, not just the object.
  const audioTracks = stream?.getAudioTracks().length ?? 0;
  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!enabled || !track) {
      setSpeaking(false);
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const t = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      setSpeaking(Math.sqrt(sum / data.length) > 0.04);
    }, 150);
    return () => {
      clearInterval(t);
      void ctx.close();
    };
  }, [stream, enabled, audioTracks]);
  return speaking;
}

function Tile({
  stream,
  user,
  name,
  muted,
  audio,
  video,
  mirror,
  self,
}: {
  stream: MediaStream | null;
  user: { id?: string; userId?: string; name?: string | null };
  name: string;
  muted?: boolean;
  audio: boolean;
  video: boolean;
  mirror?: boolean;
  self?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const speaking = useSpeaking(self ? null : stream, audio);
  const hasVideo = video && !!stream?.getVideoTracks().some((t) => t.readyState === "live");
  const trackCount = stream?.getTracks().length ?? 0;

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream, trackCount]);

  return (
    <figure
      className={cn(
        "relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-[#1a1a1a] ring-2 transition-shadow sm:w-48",
        speaking ? "ring-signal" : "ring-transparent",
      )}
    >
      {/* Always mounted: remote audio plays through this element even with the camera off. */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn("h-full w-full object-cover", mirror && "-scale-x-100", !hasVideo && "opacity-0")}
      />
      {!hasVideo && (
        <div className="absolute inset-0 grid place-items-center">
          <Avatar user={user} size="lg" className="ring-0" />
        </div>
      )}
      <figcaption className="absolute right-1.5 bottom-1.5 left-1.5 flex items-center gap-1">
        <span className="truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">{name}</span>
        {!audio && (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-danger text-white" aria-label="Muted">
            <MicOff className="h-3 w-3" />
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function Control({ label, active = true, danger, onClick, children }: { label: string; active?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={danger ? undefined : active}
      onClick={onClick}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full transition-colors",
        danger ? "bg-danger text-white hover:brightness-110" : active ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-[#121a2b] hover:bg-white/90",
      )}
    >
      {children}
    </button>
  );
}

export default function CallDock({ call, me }: { call: ReturnType<typeof useCall>; me: User }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!call.joined) return null;
  const count = call.peers.length + 1;

  return (
    <section
      aria-label="Video call"
      className="pointer-events-auto absolute right-3 bottom-20 z-30 max-w-[calc(100%-1.5rem)] rounded-2xl bg-[#0b0b0b]/95 p-2 text-white shadow-float ring-1 ring-white/10 backdrop-blur md:bottom-3"
    >
      <div className="flex items-center justify-between gap-3 px-1.5 pb-2">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-signal" />
          On call · {count} {count === 1 ? "person" : "people"}
        </p>
        <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Show video" : "Hide video"} className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white">
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn("flex gap-2 overflow-x-auto pb-2", collapsed && "sr-only")}>
        <Tile stream={call.preview} user={me} name={call.sharing ? "You (presenting)" : "You"} muted audio={call.audioOn} video={call.videoOn || call.sharing} mirror={!call.sharing} self />
        {call.peers.map((p) => (
          <Tile key={p.id} stream={p.stream} user={{ userId: p.info.userId, name: p.info.name }} name={p.info.name} audio={p.info.audio} video={p.info.video} />
        ))}
        {call.peers.length === 0 && (
          <div className="grid aspect-video w-40 shrink-0 place-items-center rounded-xl border border-dashed border-white/20 px-3 text-center text-xs text-white/60 sm:w-48">
            Waiting for others. Everyone on the board can see the call is live.
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pt-0.5">
        <Control label={call.audioOn ? "Mute microphone" : "Unmute microphone"} active={call.audioOn} onClick={call.toggleAudio}>
          {call.audioOn ? <Mic className="h-[18px] w-[18px]" /> : <MicOff className="h-[18px] w-[18px]" />}
        </Control>
        <Control label={call.videoOn ? "Turn camera off" : "Turn camera on"} active={call.videoOn} onClick={call.toggleVideo}>
          {call.videoOn ? <Video className="h-[18px] w-[18px]" /> : <VideoOff className="h-[18px] w-[18px]" />}
        </Control>
        {call.canShare && (
          <Control label={call.sharing ? "Stop presenting" : "Present your screen"} active={!call.sharing} onClick={call.toggleShare}>
            <MonitorUp className="h-[18px] w-[18px]" />
          </Control>
        )}
        <Control label="Leave call" danger onClick={call.leave}>
          <PhoneOff className="h-[18px] w-[18px]" />
        </Control>
      </div>
    </section>
  );
}
