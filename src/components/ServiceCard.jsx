import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function ServiceCard({ 
  title, 
  description, 
  image,
  icon,
  to, 
  arrowBgClass = 'bg-purple-100',
  arrowColorClass = 'text-purple-600',
  isAvailable = true
}) {
  return (
    <Link 
      to={to}
      className="group relative bg-white/95 backdrop-blur-sm rounded-2xl md:rounded-3xl p-3 md:p-3.5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2.5 sm:gap-3 cursor-pointer overflow-hidden min-h-[96px]"
    >
      {/* Availability Status Indicator Dot */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <span 
          className={`block w-2 h-2 rounded-full shadow-xs ${
            isAvailable ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
          }`} 
          title={isAvailable ? 'Available' : 'Unavailable'}
        />
      </div>

      {/* Service Image / Icon container */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 bg-white border border-gray-100/90 flex items-center justify-center shadow-2xs">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
      </div>

      {/* Service Info */}
      <div className="flex flex-col flex-grow justify-center min-w-0 pr-5 sm:pr-6">
        <h3 className="font-display font-black text-xs sm:text-sm text-[#1E1B4B] leading-snug tracking-tight truncate">
          {title}
        </h3>
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 leading-tight line-clamp-2 mt-0.5">
          {description}
        </p>
      </div>

      {/* Arrow Circle Button */}
      <div className={`absolute right-2.5 bottom-2.5 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full ${arrowBgClass} flex items-center justify-center flex-shrink-0 shadow-xs transition-transform group-hover:translate-x-0.5`}>
        <ChevronRight className={`w-3.5 h-3.5 ${arrowColorClass} stroke-[2.5]`} />
      </div>
    </Link>
  );
}
