import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-100">
      <Text className="text-2xl font-bold text-blue-600 mb-4">
        Hello NativeWind!
      </Text>
      <View className="bg-green-500 p-4 rounded-lg">
        <Text className="text-white font-semibold">
          Tailwind bekerja! 🎉
        </Text>
      </View>
    </View>
  );
}