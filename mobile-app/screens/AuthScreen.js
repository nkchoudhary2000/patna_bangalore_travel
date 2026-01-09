import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { styled } from 'nativewind';
import { auth } from '../firebaseConfig';
import { signInAnonymously } from 'firebase/auth';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledButton = styled(TouchableOpacity);

export default function AuthScreen() {
    const handleLogin = async () => {
        // Simple Anonymous login
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error(e);
            alert("Login failed: " + e.message);
        }
    };

    return (
        <StyledView className="flex-1 bg-slate-900 items-center justify-center p-6">
            <StyledView className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm border border-white/10 items-center">
                <StyledText className="text-white text-2xl font-bold mb-2">Travel Tracker</StyledText>
                <StyledText className="text-gray-400 text-sm mb-8 text-center bg-slate-200 text-slate-800 px-2 rounded">
                    Admin Access
                </StyledText>

                <StyledButton
                    onPress={handleLogin}
                    className="w-full bg-blue-600 p-4 rounded-xl items-center active:opacity-90"
                >
                    <StyledText className="text-white font-bold text-lg">Enter App</StyledText>
                </StyledButton>
            </StyledView>
        </StyledView>
    );
}
