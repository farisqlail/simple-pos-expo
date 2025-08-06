// components/icons/MenuIcon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

const MenuIcon: React.FC<IconProps> = ({ width = 24, height = 24, color = 'white' }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M20 7L4 7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M20 12L4 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M20 17L4 17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
};

export default MenuIcon;
