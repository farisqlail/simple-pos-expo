import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#B81D1D' }}>
      <View className="w-11/12 max-w-md bg-white p-6 rounded-lg shadow-lg">
        <Text className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login
        </Text>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Email</Text>
          <TextInput
            placeholder="Enter your email"
            keyboardType="email-address"
            className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
            placeholderTextColor="#999"
          />
        </View>

        {/* Password */}
        <View className="mb-6">
          <Text className="text-gray-700 mb-1">Password</Text>
          <TextInput
            placeholder="Enter your password"
            secureTextEntry
            className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
            placeholderTextColor="#999"
          />
        </View>

        {/* Button */}
        <TouchableOpacity className="bg-red-600 py-3 rounded">
          <Text className="text-white text-center font-semibold">Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
