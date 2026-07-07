"use client";

import React, { useState } from "react";
import { X, Mic, MicOff, Video, VideoOff, Crown, Shield, ShieldOff, UserMinus, VolumeX, Vote, Plus, Trash2 } from "lucide-react";

interface Participant {
  uid: string | number;
  authUid: string;
  displayName: string;
  photoURL?: string;
  audioMuted: boolean;
  videoMuted: boolean;
  handRaised?: boolean;
}

interface Poll {
  question: string;
  options: string[];
  votes?: Record<string, number>;
  active: boolean;
  createdBy: string;
}

interface ParticipantPanelProps {
  participants: Participant[];
  onClose: () => void;
  localUid: string | number | null;
  localIsAdmin: boolean;
  adminsMap: { [key: string]: boolean };
  creatorUid: string | null;
  participantReactions?: { [uid: string]: string };
  onPromoteAdmin: (authUid: string) => void;
  onDemoteAdmin: (authUid: string) => void;
  onKickUser: (clientUid: string | number) => void;
  onForceMuteUser: (clientUid: string | number) => void;
  
  // Poll props
  activePoll: Poll | null;
  hasVoted: boolean;
  onVotePoll: (optionIndex: number) => void;
  onEndPoll: () => void;
  onCreatePoll: (question: string, options: string[]) => void;
  visible: boolean;
}

export default function ParticipantPanel({
  participants,
  onClose,
  localUid,
  localIsAdmin,
  adminsMap,
  creatorUid,
  participantReactions = {},
  onPromoteAdmin,
  onDemoteAdmin,
  onKickUser,
  onForceMuteUser,
  activePoll,
  hasVoted,
  onVotePoll,
  onEndPoll,
  onCreatePoll,
  visible,
}: ParticipantPanelProps) {
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : "U";
  };

  const handleAddOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (val: string, index: number) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handleLaunchPoll = () => {
    const q = pollQuestion.trim();
    const opts = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      alert("Please provide a question and at least 2 options.");
      return;
    }
    onCreatePoll(q, opts);
    setShowPollCreator(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  // Calculate poll results
  const totalVotes = activePoll?.votes ? Object.keys(activePoll.votes).length : 0;
  const optionVotes = activePoll?.options.map((_, idx) => {
    if (!activePoll.votes) return 0;
    return Object.values(activePoll.votes).filter(v => v === idx).length;
  }) || [];

  const touchStartX = React.useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX > 0) {
      setDragX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragX > 100) {
      onClose();
    }
    setDragX(0);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: visible 
          ? `translateX(${dragX}px)` 
          : `translateX(100%)`
      }}
      className={`fixed inset-y-0 right-0 md:relative z-40 h-full flex flex-col border-l border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/85 dark:bg-vercel-black/85 backdrop-blur-xl backdrop-saturate-180 shadow-2xl md:shadow-none overflow-hidden transition-all duration-300 ease-in-out ${
        isDragging ? "transition-none" : ""
      } ${
        visible
          ? "w-full md:w-80 opacity-100"
          : "w-0 md:w-0 opacity-0 pointer-events-none md:border-l-0"
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark">
        <h2 className="text-sm font-bold tracking-wider uppercase">Room Members ({participants.length})</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-vercel-text-dark transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Content Areas split between Members & Polls */}
      <div className="flex-grow overflow-y-auto p-3 space-y-4">
        {/* Members Section */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-vercel-text-muted font-mono pl-1">
            Active Call
          </p>
          {participants.map((person) => {
            const isMe = localUid !== null && String(person.uid) === String(localUid);
            const isHost = adminsMap[person.authUid] === true;
            const isCreator = creatorUid !== null && person.authUid === creatorUid;

            return (
              <div
                key={person.uid}
                className="flex flex-col gap-1.5 p-2.5 rounded border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark"
              >
                {/* Top Row: User Avatar, Name, and Role Badge */}
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {person.photoURL ? (
                      <img
                        src={person.photoURL}
                        alt={person.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-vercel-border-light dark:border-vercel-border-dark"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark flex items-center justify-center text-[10px] font-bold font-mono">
                        {getInitials(person.displayName)}
                      </div>
                    )}
                    <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
                      <p className="text-xs font-semibold truncate text-vercel-text-light dark:text-vercel-text-dark flex items-center gap-1">
                        {person.displayName} 
                        {isMe && <span className="text-[9px] text-vercel-text-muted font-normal font-mono">(You)</span>}
                      </p>
                      {person.handRaised && (
                        <span className="text-xs animate-bounce" title="Hand Raised">✋</span>
                      )}
                      {participantReactions[String(person.uid)] && (
                        <span className="text-sm animate-pulse" title="Reaction">{participantReactions[String(person.uid)]}</span>
                      )}
                    </div>
                  </div>

                  {/* Role badge */}
                  {isHost && (
                    <div className="flex items-center gap-1 text-[8px] tracking-wider uppercase font-bold text-yellow-600 dark:text-yellow-500 font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">
                      <Crown className="h-2.5 w-2.5 fill-current" />
                      <span>{isCreator ? "Creator" : "Host"}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Local Status Indicators & Admin Control Action Toolbar */}
                <div className="flex items-center justify-between border-t border-vercel-border-light dark:border-vercel-border-dark/50 pt-2 mt-1">
                  {/* Status Icons */}
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded text-vercel-text-muted`}>
                      {!person.audioMuted ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3 text-red-500" />}
                    </div>
                    <div className={`p-1 rounded text-vercel-text-muted`}>
                      {!person.videoMuted ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>

                  {/* Operational controls (Only visible to hosts managing OTHER guests) */}
                  {localIsAdmin && !isMe && (
                    <div className="flex items-center gap-1.5">
                      {/* Admin Promotion / Demotion (Creators cannot be demoted) */}
                      {!isCreator && (
                        <button
                          onClick={() => isHost ? onDemoteAdmin(person.authUid) : onPromoteAdmin(person.authUid)}
                          className={`p-1 border rounded transition-colors ${
                            isHost 
                              ? "border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white" 
                              : "border-vercel-border-light dark:border-vercel-border-dark hover:border-neutral-400 dark:hover:border-neutral-600 text-vercel-text-muted"
                          }`}
                          title={isHost ? "Demote Host" : "Make Co-Host"}
                        >
                          {isHost ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        </button>
                      )}

                      {/* Force Mute (Mutes active mics) */}
                      {!person.audioMuted && (
                        <button
                          onClick={() => onForceMuteUser(person.uid)}
                          className="p-1 border border-vercel-border-light dark:border-vercel-border-dark rounded hover:bg-red-500 hover:text-white hover:border-transparent transition-colors text-vercel-text-muted"
                          title="Force Mute Microphone"
                        >
                          <VolumeX className="h-3 w-3" />
                        </button>
                      )}

                      {/* Kick out of call workspace */}
                      {!isCreator && (
                        <button
                          onClick={() => onKickUser(person.uid)}
                          className="p-1 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                          title="Kick from Room"
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-vercel-border-light dark:border-vercel-border-dark/50 my-2" />

        {/* Live Polls Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-vercel-text-muted font-mono flex items-center gap-1">
              <Vote className="h-3.5 w-3.5" /> Live Polls
            </p>
            {localIsAdmin && !activePoll && !showPollCreator && (
              <button
                onClick={() => setShowPollCreator(true)}
                className="text-[9px] uppercase tracking-wider font-bold text-white dark:text-black bg-vercel-text-light dark:bg-white rounded px-2 py-0.5 hover:opacity-90 flex items-center gap-1 font-mono"
              >
                <Plus className="h-3 w-3" /> New Poll
              </button>
            )}
          </div>

          {/* Active Poll View */}
          {activePoll && (
            <div className="p-3 border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark rounded-xl space-y-2.5">
              <div className="space-y-1">
                <p className="text-xs font-bold font-mono text-vercel-text-light dark:text-vercel-text-dark">
                  {activePoll.question}
                </p>
                <p className="text-[9px] font-mono text-vercel-text-muted">
                  {totalVotes} total votes · {activePoll.active ? "Active" : "Closed"}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {activePoll.options.map((opt, idx) => {
                  const votes = optionVotes[idx] || 0;
                  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isWinner = activePoll.active ? false : votes > 0 && votes === Math.max(...optionVotes);

                  return (
                    <div key={idx} className="space-y-1">
                      {activePoll.active && !hasVoted ? (
                        <button
                          onClick={() => onVotePoll(idx)}
                          className="w-full text-left text-[11px] p-2 rounded border border-vercel-border-light dark:border-vercel-border-dark hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark/50 transition-colors font-mono font-bold text-vercel-text-light dark:text-vercel-text-dark"
                        >
                          {opt}
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-vercel-text-light dark:text-vercel-text-dark">
                            <span className={isWinner ? "font-bold text-green-500" : ""}>{opt}</span>
                            <span className="opacity-80">{votes} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-vercel-border-light dark:bg-vercel-border-dark rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-green-500" : "bg-vercel-text-light dark:bg-white"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* End Poll for Admin */}
              {localIsAdmin && activePoll.active && (
                <button
                  onClick={onEndPoll}
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-wider rounded border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all font-mono"
                >
                  End and Lock Poll
                </button>
              )}
            </div>
          )}

          {/* Poll Creator Form */}
          {showPollCreator && (
            <div className="p-3 border border-dashed border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark rounded-xl space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vercel-text-muted font-mono">
                  Poll Question
                </label>
                <input
                  type="text"
                  placeholder="e.g. Should we launch tomorrow?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-vercel-text-light dark:text-vercel-text-dark font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vercel-text-muted font-mono flex justify-between">
                  <span>Options</span>
                  <span className="opacity-80">{pollOptions.length}/5</span>
                </label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(e.target.value, idx)}
                      className="flex-1 h-8 px-2 text-[11px] rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-vercel-text-light dark:text-vercel-text-dark font-mono"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 5 && (
                <button
                  onClick={handleAddOption}
                  className="text-[9px] uppercase tracking-wider font-bold text-vercel-text-light dark:text-white flex items-center gap-1 font-mono"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Option
                </button>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowPollCreator(false)}
                  className="flex-1 h-8 text-[9px] uppercase font-bold tracking-wider rounded border border-vercel-border-light dark:border-vercel-border-dark font-mono text-vercel-text-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLaunchPoll}
                  className="flex-1 h-8 text-[9px] uppercase font-bold tracking-wider rounded bg-vercel-text-light text-white dark:bg-white dark:text-black font-mono"
                >
                  Launch
                </button>
              </div>
            </div>
          )}

          {!activePoll && !showPollCreator && (
            <p className="text-[10px] text-vercel-text-muted font-mono text-center py-4 border border-dashed border-vercel-border-light dark:border-vercel-border-dark rounded-xl bg-vercel-light dark:bg-vercel-dark">
              No active polls.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
