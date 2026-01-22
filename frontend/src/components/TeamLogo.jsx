import React from 'react';

/**
 * TeamLogo component - Displays team logo or fallback to colored abbreviation
 * @param {Object} team - Team object with logo, color, abbreviation, name
 * @param {string} size - Size class (sm, md, lg, xl) or custom className
 * @param {boolean} showName - Whether to show team name below logo
 */
const TeamLogo = ({ team, size = 'md', className = '', showName = false, style = {} }) => {
  if (!team) return null;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-4xl'
  };

  const sizeClass = typeof size === 'string' && sizeClasses[size] ? sizeClasses[size] : size;
  const logoUrl = team.logo || team.team_logo;
  const teamColor = team.color || team.team_color || '#111827';
  
  // Safely get abbreviation
  let abbreviation = '?';
  if (team.abbreviation) {
    abbreviation = String(team.abbreviation);
  } else if (team.team_abbr) {
    abbreviation = String(team.team_abbr);
  } else if (team.team_abbreviation) {
    abbreviation = String(team.team_abbreviation);
  } else if (team.name) {
    abbreviation = String(team.name).charAt(0) || '?';
  } else if (team.team_name) {
    abbreviation = String(team.team_name).charAt(0) || '?';
  }
  
  const hasLogo = logoUrl && typeof logoUrl === 'string' && (logoUrl.startsWith('http') || logoUrl.startsWith('/uploads/') || logoUrl.startsWith('/'));

  const logoElement = (
    <div
      className={`${sizeClass} rounded-lg flex items-center justify-center font-heading font-bold text-white shadow-lg overflow-hidden ${className}`}
      style={{ backgroundColor: teamColor, ...style }}
    >
      {hasLogo ? (
        <>
          <img 
            src={logoUrl} 
            alt={team.name || team.team_name || 'Team'} 
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to abbreviation if image fails to load
              e.target.style.display = 'none';
              const fallback = e.target.nextElementSibling;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <span 
            className="hidden items-center justify-center w-full h-full"
            style={{ display: 'none' }}
          >
            {abbreviation.length > 2 ? abbreviation.substring(0, 2) : abbreviation}
          </span>
        </>
      ) : (
        <span className="flex items-center justify-center w-full h-full">
          {abbreviation.length > 2 ? abbreviation.substring(0, 2) : abbreviation}
        </span>
      )}
    </div>
  );

  if (showName) {
    return (
      <div className={`flex flex-col items-center ${className}`} style={style}>
        {logoElement}
        <span className="mt-1 text-xs text-white/60 text-center truncate max-w-[80px]">
          {team.name || team.team_name || 'Team'}
        </span>
      </div>
    );
  }

  return logoElement;
};

export default TeamLogo;
