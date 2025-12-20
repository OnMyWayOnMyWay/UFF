const SkeletonLoader = ({ type = 'card' }) => {
  if (type === 'card') {
    return (
      <div className="stat-card-modern animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-white/10 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-full"></div>
      </div>
    );
  }

  if (type === 'stat') {
    return (
      <div className="stat-card-modern animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
          <div className="flex-1 ml-4">
            <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <tr className="animate-pulse">
        <td><div className="h-4 bg-white/10 rounded w-8"></div></td>
        <td><div className="h-4 bg-white/10 rounded w-32"></div></td>
        <td><div className="h-4 bg-white/10 rounded w-12"></div></td>
        <td><div className="h-4 bg-white/10 rounded w-12"></div></td>
        <td><div className="h-4 bg-white/10 rounded w-16"></div></td>
      </tr>
    );
  }

  return (
    <div className="glass-card animate-pulse">
      <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-white/10 rounded w-full"></div>
        <div className="h-4 bg-white/10 rounded w-5/6"></div>
        <div className="h-4 bg-white/10 rounded w-4/6"></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
