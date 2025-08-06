// app/(tabs)/_layout.tsx
import React, { useState } from "react";
import { View } from "react-native";
import { Stack, useRouter } from 'expo-router';
import BottomNav, { NavItem } from '@/components/ui/BottomNav';

export default function TabLayout() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('beranda');
  
  const navItems: Omit<NavItem, 'onPress'>[] = [
    {
      id: 'beranda',
      label: 'Beranda',
      icon: 'home-outline',
    },
    {
      id: 'transaksi',
      label: 'Transaksi', 
      icon: 'card-outline',
    },
    {
      id: 'riwayat',
      label: 'Riwayat',
      icon: 'time-outline', 
    },
  ];

  const handleNavigation = (id: string) => {
    setActiveTab(id);
    
    // Navigate berdasarkan id
    if (id === 'beranda') {
      router.push('/(tabs)/' as any);
    } else {
      router.push(`/(tabs)/${id}` as any);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      
      <BottomNav
        items={navItems.map(item => ({
          ...item,
          onPress: () => handleNavigation(item.id)
        }))}
        activeId={activeTab}
        activeColor="#ef4444"
        inactiveColor="#6b7280"
      />
    </View>
  );
}