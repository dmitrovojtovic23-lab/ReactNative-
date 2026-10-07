import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import ProfileScreen from "./ProfileScreen";

const Stack = createNativeStackNavigator();
const TOKEN_KEY = "userToken";

export default function App() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (active) {
          setToken(saved || null);
        }
      } catch {
        if (active) {
          setToken(null);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (newToken) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      setToken(null);
    }
  }, []);

  const loader = useMemo(
      () => (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" }}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
      ),
      []
  );

  if (!ready) {
    return loader;
  }

  return (
      <NavigationContainer>
        <Stack.Navigator>
          {token ? (
              <Stack.Screen name="Profile" options={{ headerShown: false }}>
                {(props) => <ProfileScreen {...props} token={token} onLogout={signOut} />}
              </Stack.Screen>
          ) : (
              <>
                <Stack.Screen name="Login" options={{ headerShown: false }}>
                  {(props) => <LoginScreen {...props} onLogin={signIn} />}
                </Stack.Screen>
                <Stack.Screen
                    name="Register"
                    options={{ title: "Реєстрація", headerTitleAlign: "center" }}
                >
                  {(props) => <RegisterScreen {...props} onLogin={signIn} />}
                </Stack.Screen>
              </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
  );
}