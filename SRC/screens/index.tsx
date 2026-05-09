import 'react-native-url-polyfill/auto';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {

  return(
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome to your Emotional Support App💙</Text>
      <Text style={styles.subtext}>
        We're here to walk with you through every emotion, every step.
        you're not alone.❤️
        We're here to listen you in any situation, even when no-one listens to you we will listen to you❤️.
        We listen to you without judging you.
      </Text>

      <View style={styles.buttonWrapper}>
        <Button
          title="Get Started"
          color="#4A90E2"
          />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 25,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
});