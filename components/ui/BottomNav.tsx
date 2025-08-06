// components/ui/BottomNav.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface NavItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export interface BottomNavProps {
  items: NavItem[];
  activeId?: string;
  backgroundColor?: string;
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
}

const BottomNav: React.FC<BottomNavProps> = ({
  items,
  activeId,
  backgroundColor = '#ffffff',
  activeColor = '#ef4444',
  inactiveColor = '#6b7280',
  style
}) => {
  return (
    <View 
      style={[
        {
          flexDirection: 'row',
          backgroundColor,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          elevation: 5,
        },
        style
      ]}
    >
      {items.map((item, index) => {
        const isActive = activeId === item.id;
        const itemColor = isActive ? activeColor : inactiveColor;
        
        return (
          <TouchableOpacity
            key={item.id}
            onPress={item.onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: isActive ? `${activeColor}15` : 'transparent',
              }}
              className="rounded-lg"
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={itemColor}
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 14,
                  fontWeight: isActive ? '600' : '400',
                  color: itemColor,
                }}
              >
                {item.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomNav;