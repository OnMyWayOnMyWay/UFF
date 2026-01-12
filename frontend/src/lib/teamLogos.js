// Team logo configuration and utilities
// Logos and colors are fetched from the API and cached in memory + localStorage
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

let logoCache = null;
let colorCache = null;

// Pre-configured team color schemes for fallback logo generation
export const TEAM_COLORS = {
  // Grand Central Conference - North
  'Columbus Colts': { primary: '#003A70', secondary: '#FFFFFF' },
  'Saskatoon Stampede': { primary: '#006747', secondary: '#FFD700' },
  'Valor City Spartans': { primary: '#8B0000', secondary: '#FFD700' },
  'Laredo Longhorns': { primary: '#FF8200', secondary: '#003C71' },
  
  // Grand Central Conference - South
  'Evergreen Stags': { primary: '#2D5016', secondary: '#8B4513' },
  'Seattle Skyclaws': { primary: '#002244', secondary: '#69BE28' },
  'San Diego Devils': { primary: '#DC143C', secondary: '#000000' },
  'North Dakota Colonels': { primary: '#003087', secondary: '#FFC72C' },
  
  // Ridge Conference - North
  'Vicksburg Vortex': { primary: '#1F4788', secondary: '#FFD700' },
  'Nashville Nightmares': { primary: '#000000', secondary: '#FFD700' },
  'New York Guardians': { primary: '#0B2265', secondary: '#A5ACAF' },
  'Columbus Colts': { primary: '#003A70', secondary: '#FFFFFF' },
  
  // Ridge Conference - South  
  'Portland Steel': { primary: '#708090', secondary: '#E03A3E' },
  'Richmond Rebellion': { primary: '#DC143C', secondary: '#000000' },
  'Evergreen Stags': { primary: '#2D5016', secondary: '#8B4513' },
  'Seattle Skyclaws': { primary: '#002244', secondary: '#69BE28' },
  
  // Legacy teams (keeping for backwards compatibility)
  'Everglades Elders': { primary: '#2D5016', secondary: '#FF6B35' },
  'Winter Haven Aces': { primary: '#C41E3A', secondary: '#FFFFFF' },
  'Pensacola Panthers': { primary: '#0047AB', secondary: '#FFFFFF' },
  'Valdosta Vipers': { primary: '#FFD700', secondary: '#000000' },
  'Lakeland Lightning': { primary: '#9400D3', secondary: '#FFFFFF' },
  'Ocala Owls': { primary: '#8B7355', secondary: '#FFD700' },
  'Giddings Buffaloes': { primary: '#8B7355', secondary: '#FFFFFF' },
  'Eastvale Enclave': { primary: '#2E8B57', secondary: '#FFFFFF' },
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
      console.log('Loaded team logos:', Object.keys(logoCache).length, 'teams');
      // Also save to localStorage for persistence
      try {
        localStorage.setItem('teamLogosCache', JSON.stringify(logoCache));
      } catch (e) {
        console.warn('Failed to save logos to localStorage:', e);
      }
    } else {
      console.warn('Failed to load logos from API, status:', response.status);
      logoCache = {};
    }
  } catch (error) {
    console.error('Error loading team logos:', error);
    // Try to load from localStorage as fallback
    try {
      const cached = localStorage.getItem('teamLogosCache');
      logoCache = cached ? JSON.parse(cached) : {};
      if (Object.keys(logoCache).length > 0) {
        console.log('Using cached logos from localStorage');
      }
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
      console.log('Loaded team colors:', Object.keys(colorCache).length, 'teams');
      // Also save to localStorage for persistence
      try {
        localStorage.setItem('teamColorsCache', JSON.stringify(colorCache));
      } catch (e) {
        console.warn('Failed to save colors to localStorage:', e);
      }
    } else {
      console.warn('Failed to load colors from API, status:', response.status);
      colorCache = {};
    }
  } catch (error) {
    console.error('Error loading team colors:', error);
    // Try to load from localStorage as fallback
    try {
      const cached = localStorage.getItem('teamColorsCache');
      colorCache = cached ? JSON.parse(cached) : {};
      if (Object.keys(colorCache).length > 0) {
        console.log('Using cached colors from localStorage');
      }
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

export function TeamLogoAvatar({ teamName, logoMap = {}, size = 'md', className = '', colorMap = {} }) {
  const logoUrl = getTeamLogo(teamName, logoMap);
  const colors = getTeamColors(teamName, colorMap);
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
        onError={(e) => {
          console.error(`Failed to load logo for ${teamName}:`, logoUrl);
          // Hide the broken image and show initials instead
          e.target.style.display = 'none';
          // Create a fallback div
          const fallback = document.createElement('div');
          fallback.className = `rounded-lg flex items-center justify-center font-bold text-white ${sizeClasses[size]} ${className}`;
          fallback.style.backgroundColor = colors.primary;
          fallback.style.color = colors.secondary;
          fallback.title = teamName;
          fallback.textContent = initials;
          e.target.parentNode.insertBefore(fallback, e.target);
        }}
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
