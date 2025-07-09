import React from 'react';
import Image from 'next/image';

interface BusinessCardProps {
  className?: string;
  side?: 'front' | 'back';
  textColor?: string;
  qrCode?: 'qr-code.png' | 'qrcode.svg';
}

const BusinessCard: React.FC<BusinessCardProps> = ({ 
  className = '', 
  side = 'front', 
  textColor = 'text-gray-800', 
  qrCode = 'qr-code.png' 
}) => {
  // Helper function to get matching bullet color for text color
  const getBulletColor = (textColor: string) => {
    switch(textColor) {
      case 'text-white': return 'bg-white';
      case 'text-gray-800': return 'bg-gray-800';
      case 'text-gray-300': return 'bg-gray-300';
      case 'text-blue-800': return 'bg-blue-800';
      case 'text-red-800': return 'bg-red-800';
      case 'text-green-800': return 'bg-green-800';
      case 'text-purple-800': return 'bg-purple-800';
      case 'text-indigo-800': return 'bg-indigo-800';
      default: return 'bg-gray-800';
    }
  };
  if (side === 'back') {
    return (
      <div className={`bg-white shadow-lg rounded-lg p-3 border ${className}`} style={{ width: '3.5in', height: '2in' }}>
        <div className="h-full flex flex-col justify-between">
          {/* Top section with services and QR code */}
          <div className="flex justify-between">
            {/* Services Section */}
            <div className="flex-1">
              <h3 className={`text-base font-bold ${textColor} mb-2`}>Our Services</h3>
              <ul className={`space-y-0.5 text-xs ${textColor}`}>
                <li className="flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getBulletColor(textColor)}`}></span>
                  Snow & Ice Removal
                </li>
                <li className="flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getBulletColor(textColor)}`}></span>
                  Landscaping
                </li>
                <li className="flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getBulletColor(textColor)}`}></span>
                  Concrete Work
                </li>
                <li className="flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getBulletColor(textColor)}`}></span>
                  Demolition
                </li>
                <li className="flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getBulletColor(textColor)}`}></span>
                  Painting
                </li>
                <li className="flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getBulletColor(textColor)}`}></span>
                  General Construction
                </li>
              </ul>
            </div>
            
            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center ml-3">
              <div className="w-16 h-16 flex items-center justify-center mb-2">
                <Image
                  src={`/${qrCode}`}
                  alt="QR Code for Quote"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
              </div>
              <div className="flex items-center justify-center">
                <Image
                  src="/VSRv2.png"
                  alt="VSR LLC Logo"
                  width={60}
                  height={24}
                  className="h-6"
                />
              </div>
            </div>
          </div>
          
          {/* Bottom spacer */}
          <div></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-lg rounded-lg p-3 border ${className}`} style={{ width: '3.5in', height: '2in' }}>
      <div className="h-full flex flex-col justify-between">
        {/* Top section with company name and contact info */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-bold ${textColor} leading-tight`}>VSR LLC</h2>
            <p className={`text-xs ${textColor} opacity-75`}>Professional Construction Services</p>
          </div>
          
          {/* Contact Information */}
          <div className="text-right">
            <div className={`space-y-0.5 text-sm ${textColor}`}>
              <div>
                <p className={`font-semibold ${textColor}`}>Marcus Vargas</p>
              </div>
              <div>
                <p className="text-xs">(720) 838-5807</p>
              </div>
              <div>
                <p className="text-xs">marcus@vsrsnow.com</p>
              </div>
              <div>
                <p className="text-xs">www.vsrsnow.com</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom section with logo and credentials */}
        <div className="flex items-center justify-center">
          <Image
            src="/VSRv2.png"
            alt="VSR LLC Logo"
            width={60}
            height={24}
            className="h-6 mr-3"
          />
          <div className="text-center">
            <p className={`text-xs font-semibold ${textColor}`}>Licensed & Insured</p>
            <p className={`text-xs ${textColor} opacity-75`}>Serving the Denver Metro Area</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCard;