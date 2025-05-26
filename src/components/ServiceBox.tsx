// components/ServiceBox.tsx
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  name: string;
  description?: string;
  link?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  toolXPosition?: 'left' | 'center' | 'right';
  toolYPosition?: 'top' | 'center' | 'bottom';
  variant?: 'landing' | 'sidebar';
  icon?: React.ReactNode;
  disabled?: boolean;
}

const siteVersion = process.env.NEXT_PUBLIC_SITE_VERSION;
const isV2 = siteVersion === '2';

export default function ServiceBox({
  name,
  description,
  link = '#',
  tooltipPosition = 'top',
  disabled = false,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || !isV2;

  const baseClasses = `relative group p-4 rounded shadow transition text-center font-medium`;
  const stateClasses = isDisabled
    ? 'bg-white/10 text-white cursor-not-allowed opacity-50'
    : 'bg-white/10 hover:bg-white/20 cursor-pointer';

  const tooltipBase = `absolute w-64 px-3 py-2 text-sm text-white bg-black bg-opacity-80 rounded z-20`;
  const tooltipPositionClass =
    tooltipPosition === 'top'
      ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
      : 'top-full mt-2 left-1/2 -translate-x-1/2';

  const content = (
    <div
      className={`${baseClasses} ${stateClasses}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && description && (
        <div className={`${tooltipBase} ${tooltipPositionClass}`}>
          {description}
        </div>
      )}

      <div>{name}</div>

      {isDisabled && (
        <div className="text-xs text-gray-400 mt-1 italic">Gallery coming in V2</div>
      )}
    </div>
  );

  return isDisabled ? content : <Link href={link}>{content}</Link>;
}
