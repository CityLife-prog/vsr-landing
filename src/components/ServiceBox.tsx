// components/ServiceBox.tsx
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  name: string;
  description?: string;
  link?: string;
  tooltipPosition?: 'top' | 'bottom';
}

export default function ServiceBox({ name, description, link = '#', tooltipPosition = 'top' }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={link} passHref>
      <div
        className="relative group bg-white/10 hover:bg-white/20 p-4 rounded shadow cursor-pointer transition"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered && description && (
          <div
            className={`absolute w-64 px-3 py-2 text-sm text-white bg-black bg-opacity-80 rounded z-20 ${
              tooltipPosition === 'top'
                ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
                : 'top-full mt-2 left-1/2 -translate-x-1/2'
            }`}
          >
            {description}
          </div>
        )}
        <div className="text-center font-medium">{name}</div>
      </div>
    </Link>
  );
}
