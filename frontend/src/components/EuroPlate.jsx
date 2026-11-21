import React from 'react';

/**
 * EuroPlate — Pure vector EU / Belgian (B) / RO license plate badge (xs = 19px, sm = 24px, lg = 36px)
 * Official Belgian license plate styling when country is 'B' or 'BE':
 *   - White reflective plate (#ffffff)
 *   - Ruby-red Belgian border (#b91c1c)
 *   - Blue EU strip (#003399) with golden stars (#ffcc00) and white 'B'
 *   - Ruby-red Belgian stamped characters (#991b1b)
 */
export default function EuroPlate({ number, country = 'B', size = 'sm', className = '' }) {
    if (!number || number === 'NN') return null;
    const isLg = size === 'lg';
    const isXs = size === 'xs';
    const isBelgian = country === 'B' || country === 'BE';
    const displayCountry = isBelgian ? 'B' : country;

    return (
        <span
            className={`inline-flex items-stretch rounded-[5px] overflow-hidden shadow-2xs select-none shrink-0 tabular-nums ${
                isLg ? 'h-9 text-sm border-2' : isXs ? 'h-[19px] text-[10px] border-[1.5px]' : 'h-6 text-[11.5px] border-[1.5px]'
            } ${className}`}
            style={{
                backgroundColor: '#ffffff',
                borderColor: isBelgian ? '#b91c1c' : '#cbd5e1',
            }}
        >
            <span
                className={`flex flex-col items-center justify-between py-0.5 font-black text-white shrink-0 ${
                    isLg ? 'w-4 text-[8px]' : isXs ? 'w-2.5 text-[5.5px]' : 'w-3.5 text-[6.5px]'
                }`}
                style={{ backgroundColor: '#003399' }}
                aria-hidden="true"
            >
                <span style={{ color: '#ffcc00', lineHeight: 1 }}>★</span>
                <span style={{ lineHeight: 1 }}>{displayCountry}</span>
            </span>
            <span
                className={`euro-ro-plate-num flex items-center justify-center font-black tracking-wider whitespace-nowrap ${
                    isLg ? 'px-2.5' : isXs ? 'px-1.5' : 'px-2'
                }`}
                style={{
                    color: isBelgian ? '#991b1b' : '#0f172a',
                    backgroundColor: '#ffffff',
                }}
            >
                {number}
            </span>
        </span>
    );
}
