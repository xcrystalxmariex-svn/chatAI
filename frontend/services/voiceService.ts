import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

class VoiceService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;

  async startRecording(): Promise<void> {
    try {
      console.log('Requesting permissions...');
      const { granted } = await Audio.requestPermissionsAsync();
      
      if (!granted) {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      this.isRecording = true;
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      return null;
    }

    try {
      console.log('Stopping recording...');
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;
      console.log('Recording stopped, URI:', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async transcribeAudio(audioUri: string, apiKey: string): Promise<string> {
    try {
      // Read audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      // Create form data
      const formData = new FormData();
      const audioBlob = await (await fetch(`data:audio/m4a;base64,${audioBase64}`)).blob();
      formData.append('file', audioBlob, 'audio.m4a');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }

      const data = await response.json();
      return data.text;
    } catch (error: any) {
      console.error('Transcription error:', error);
      throw new Error(error.message || 'Failed to transcribe audio');
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export default new VoiceService();