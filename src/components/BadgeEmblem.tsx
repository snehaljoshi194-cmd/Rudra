import React from 'react';
import {
  Award,
  Coins,
  Compass,
  Crown,
  Flame,
  Gem,
  Mountain,
  Shield,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { AchievementDefinition } from '../types/game';

interface BadgeEmblemProps {
  badge: AchievementDefinition;
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
}

export const BadgeEmblem: React.FC<BadgeEmblemProps> = ({
  badge,
  size = 'md',
  locked = false,
}) => {
  const dim =
    size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const iconCls =
    size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  const renderIcon = () => {
    switch (badge.badgeIcon) {
      case 'compass':
        return <Compass className={iconCls} />;
      case 'mountain':
        return <Mountain className={iconCls} />;
      case 'crown':
        return <Crown className={iconCls} />;
      case 'coins':
        return <Coins className={iconCls} />;
      case 'star':
        return <Star className={iconCls} />;
      case 'bolt':
        return <Zap className={iconCls} />;
      case 'shield':
        return <Shield className={iconCls} />;
      case 'flame':
        return <Flame className={iconCls} />;
      case 'gem':
        return <Gem className={iconCls} />;
      case 'trophy':
        return <Trophy className={iconCls} />;
      case 'shifter':
        return (
          <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 5v14M12 5v14M18 5v9M6 12h12" strokeLinecap="round" />
            <circle cx="18" cy="17" r="2.2" fill="currentColor" />
          </svg>
        );
      case 'wheel':
        return (
          <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 3.5v6M4.8 16.5l5-3.2M19.2 16.5l-5-3.2" />
          </svg>
        );
      default:
        return <Award className={iconCls} />;
    }
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-xl border-2 shadow-md ${dim} ${
        locked ? 'opacity-45 grayscale' : ''
      }`}
      style={{
        backgroundColor: locked ? '#1e293b' : badge.badgeColor,
        borderColor: locked ? '#475569' : badge.badgeBorder,
        color: '#ffffff',
      }}
    >
      {renderIcon()}
    </div>
  );
};
