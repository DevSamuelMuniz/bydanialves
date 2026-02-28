"use client"

import { Star, MessageCircle, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileCardProps = {
  name: string
  role: string
  status: "online" | "offline" | "away"
  avatar: string
  tags?: string[]
  isVerified?: boolean
  followers?: number
}

export default function AnimatedProfileCard() {
  const alexProfile: ProfileCardProps = {
    name: "Alex Thompson",
    role: "UI/UX Designer",
    status: "online",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
    tags: ["Premium"],
    isVerified: true,
    followers: 1240,
  }

  return (
    <div className="relative flex items-center justify-center min-h-[400px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            animation: "gridMove 3s linear infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        @keyframes pulseRing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        @keyframes bounceBadge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <ProfileCard {...alexProfile} />
    </div>
  )
}

function ProfileCard({ name, role, status, avatar, tags = [], isVerified, followers }: ProfileCardProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-slate-400",
    away: "bg-yellow-400",
  }

  return (
    <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl w-72 group">

      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <div className="relative flex items-center justify-center">
          <span className={cn("h-2.5 w-2.5 rounded-full", statusColors[status])} />
          {status === "online" && (
            <span
              className={cn("absolute h-2.5 w-2.5 rounded-full", statusColors[status])}
              style={{ animation: "pulseRing 1.5s ease-in-out infinite" }}
            />
          )}
        </div>
        <span className="text-xs text-white/60 capitalize">{status}</span>
      </div>

      {/* Verified badge */}
      {isVerified && (
        <div
          className="absolute top-4 left-4"
          style={{ animation: "bounceBadge 2s ease-in-out infinite" }}
        >
          <div className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 border border-primary/30">
            <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] font-medium text-primary">Verified</span>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className="relative mt-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/20 transition-transform duration-300 group-hover:scale-105">
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
        {/* Glowing ring on hover */}
        <div className="absolute inset-0 rounded-full ring-2 ring-primary/0 transition-all duration-300 group-hover:ring-primary/50 group-hover:ring-offset-2 group-hover:ring-offset-transparent" />
      </div>

      {/* Profile Info */}
      <div
        className="flex flex-col items-center gap-1 text-center"
        style={{ animation: "slideUp 0.5s ease-out forwards" }}
      >
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="text-sm text-white/60">{role}</p>
        {followers && (
          <p className="text-xs text-white/40 mt-1">
            {followers.toLocaleString()} followers
          </p>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-primary/20 px-3 py-0.5 text-xs font-medium text-primary border border-primary/30"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-1">
        <button className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-primary/20 border border-white/10 hover:border-primary/30 px-4 py-2 text-xs font-medium text-white transition-all duration-200 hover:scale-105">
          <Star className="h-3.5 w-3.5" />
          Follow
        </button>
        <button className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-200 hover:scale-105">
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
        <button className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-200 hover:scale-105">
          <UserPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/0 transition-all duration-500 group-hover:ring-primary/30" />
    </div>
  )
}
