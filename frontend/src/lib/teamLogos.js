// Team logo configuration and utilities
// Logos and colors are fetched from the API and cached in memory + localStorage
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

let logoCache = null;
let colorCache = null;

// Pre-configured team color schemes for fallback logo generation
export const TEAM_COLORS = {
  // Grand Central Conference
  'Everglades Elders': { primary: '#2D5016', secondary: '#FF6B35' },
  'Winter Haven Aces': { primary: '#C41E3A', secondary: '#FFFFFF' },
  'Pensacola Panthers': { primary: '#0047AB', secondary: '#FFFFFF' },
  'Valdosta Vipers': { primary: '#FFD700', secondary: '#000000' },
  'Lakeland Lightning': { primary: '#9400D3', secondary: '#FFFFFF' },
  'Ocala Owls': { primary: '#8B7355', secondary: '#FFD700' },
  
  // Ridge Conference
  'Vicksburg Vortex': { primary: '#1F4788', secondary: '#FFD700' },
  'Nashville Nightmares': { primary: '#000000', secondary: '#FFD700' },
  'Giddings Buffaloes': { primary: '#8B7355', secondary: '#FFFFFF' },
  'Eastvale Enclave': { primary: '#2E8B57', secondary: '#FFFFFF' },
  'New York Guardians': { primary: '#4169E1', secondary: '#FFFFFF' },
  'Portland Steel': { primary: '#708090', secondary: '#FFD700' },
  'Richmond Rebellion': { primary: '#DC143C', secondary: '#FFFFFF' },
  'Egypt Pharaohs': { primary: '#FFD700', secondary: '#8B0000' },
};

export async function loadTeamLogos(forceRefresh = false) {
  // Return cached version if available and not forcing refresh
  if (logoCache && !forceRefresh) return logoCache;
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/teams/logos`);
    if (response.ok) {
      const data = await response.json();
      logoCache = data.logos || {};
      // Also save to localStorage for persistence
      try {
        localStorage.setItem('teamLogosCache', JSON.stringify(logoCache));
      } catch (e) {
        console.warn('Failed to save logos to localStorage:', e);
      }
    } else {
      logoCache = {};
    }
  } catch (error) {
    console.error('Error loading team logos:', error);
    // Try to load from localStorage as fallback
    try {
      const cached = localStorage.getItem('teamLogosCache');
      logoCache = cached ? JSON.parse(cached) : {};
    } catch (e) {
      logoCache = {};
    }
  }
  
  return logoCache;
}

export async function loadTeamColors(forceRefresh = false) {
  // Return cached version if available and not forcing refresh
  if (colorCache && !forceRefresh) return colorCache;
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/teams/colors`);
    if (response.ok) {
      const data = await response.json();
      colorCache = data.colors || {};
      // Also save to localStorage for persistence
      try {
        localStorage.setItem('teamColorsCache', JSON.stringify(colorCache));
      } catch (e) {
        console.warn('Failed to save colors to localStorage:', e);
      }
    } else {
      colorCache = {};
    }
  } catch (error) {
    console.error('Error loading team colors:', error);
    // Try to load from localStorage as fallback
    try {
      const cached = localStorage.getItem('teamColorsCache');
      colorCache = cached ? JSON.parse(cached) : {};
    } catch (e) {
      colorCache = {};
    }
  }
  
  return colorCache;
}

export function getTeamLogo(teamName, logoMap = {}) {
  // Return logo URL if available
  if (logoMap && logoMap[teamName]) {
    return logoMap[teamName];
  }
  
  // Fallback to default avatar with team colors
  const colors = TEAM_COLORS[teamName] || { primary: '#64748B', secondary: '#FFFFFF' };
  return null; // Will use initials instead
}

export function getTeamColors(teamName, colorMap = {}, fallbackToDefault = true) {
  // Return colors from API first
  if (colorMap && colorMap[teamName]) {
    return colorMap[teamName];
  }
  
  // Fall back to hardcoded defaults
  if (fallbackToDefault) {
    return TEAM_COLORS[teamName] || { primary: '#64748B', secondary: '#FFFFFF' };
  }
  
  return { primary: '#64748B', secondary: '#FFFFFF' };
}

export function getTeamInitials(teamName) {
  return teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export function TeamLogoAvatar({ teamName, logoMap = {}, size = 'md', className = '' }) {
  const logoUrl = getTeamLogo(teamName, logoMap);
  const colors = getTeamColors(teamName);
  const initials = getTeamInitials(teamName);
  
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl'
  };
  
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={teamName}
        className={`rounded-lg object-cover ${sizeClasses[size]} ${className}`}
        title={teamName}
      />
    );
  }
  
  return (
    <div
      className={`rounded-lg flex items-center justify-center font-bold text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: colors.primary, color: colors.secondary }}
      title={teamName}
    >
      {initials}
    </div>
  );
}
