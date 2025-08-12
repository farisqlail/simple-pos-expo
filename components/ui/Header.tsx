import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  backIconColor?: string;
  style?: string;
  titleStyle?: string;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  backgroundColor = 'bg-red-600',
  textColor = 'text-white',
  backIconColor = '#ffffff',
  style = '',
  titleStyle = '',
  rightComponent,
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className={`flex-row gap-2 px-4 py-6 pt-10 ${backgroundColor}`}>
      <View className="w-10 justify-center items-start">
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            className="-ml-2 p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={backIconColor} />
          </TouchableOpacity>
        )}
      </View>

      <View>
        <Text className={`text-xl font-semibold text-center ${textColor} ${titleStyle}`}>
          {title}
        </Text>
      </View>

    </View>
  );
};

export default Header;
