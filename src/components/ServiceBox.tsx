import Link from 'next/link';
import { useState } from 'react';

interface Props {
  name: string;
  description?: string;
  link?: string;
  tooltipPosition?: 'top' | 'bottom';
  disabled?: boolean;
  variant?: 'landing' | 'mobile';
}

const siteVersion = process.env.NEXT_PUBLIC_SITE_VERSION;
const isV2 = siteVersion === '2';

export default function ServiceBox({
  name,
  description,
  link = '#',
  tooltipPosition = 'top',
  disabled = false,
  variant = 'landing',
}: Props) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || !isV2;
  const isMobile = variant === 'mobile';

  const baseClasses = `relative p-4 rounded shadow transition font-medium text-white ${
    isMobile ? 'text-center bg-white/10 w-full' : 'text-center bg-white/10 hover:bg-white/20 cursor-pointer'
  }`;

  const tooltipBase = `absolute w-64 px-3 py-2 text-sm text-white bg-black bg-opacity-80 rounded z-20 ${
    tooltipPosition === 'top'
      ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
      : 'top-full mt-2 left-1/2 -translate-x-1/2'
  }`;

  const content = (
    <div
      className={baseClasses}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={isDisabled ? 'opacity-50' : ''}>{name}</div>

      {isDisabled && (
        <div className="text-xs text-gray-400 mt-1 italic">Gallery coming soon!</div>
      )}

      {/* Tooltip description (desktop only) */}
      {!isMobile && hovered && description && (
        <div className={tooltipBase}>{description}</div>
      )}
    </div>
  );

  return isDisabled || isMobile ? content : <Link href={link}>{content}</Link>;
}
