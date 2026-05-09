import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native';

export default function UserSetup() {
    const [name,setName] = useState('');
    const [age, setAge] = useState('');
    const [contact, setContact] = useState('');


    const handleNext = () => {
        if ( !name || !age || !contact ) {
            Alert.alert("Please fill all the details.");
            return;
        }

    };

    return (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
          >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.heading}>👋 Let's Get to know you first </Text>

                <Text style={styles.label}>Your Name </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  />

                  <Text style={styles.label}>Your Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your age"
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                    />

                    <Text style={styles.label}>Emergency Contact Number </Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="Enter emergency contact number"
                      keyboardType="phone-pad"
                      value={contact}
                      onChangeText={setContact}
                      />

                      <TouchableOpacity onPress={handleNext} style={styles.button}>
                        <Text style={styles.buttonText}>Next ➡️</Text>
                      </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
    },
    scrollContainer: {
        padding: 20,
        paddingTop: 60,
    },
    heading: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 30,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 6,
        color: '#555',
    },
    input: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        marginBottom: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4A90E2',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
});