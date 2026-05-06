import { Platform } from 'react-native';

export type SfxType = 'flip' | 'nearMiss' | 'death' | 'pickup' | 'uiClick';

type ExpoAvModule = typeof import('expo-av');

type SoundInstance = {
  setStatusAsync(status: Record<string, unknown>): Promise<unknown>;
  replayAsync(): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
};

const MUSIC_INTENSITY_STAGES = [
  { stageSeconds: 0, rate: 0.96, volume: 0.42 },
  { stageSeconds: 20, rate: 1.0, volume: 0.5 },
  { stageSeconds: 45, rate: 1.04, volume: 0.58 },
  { stageSeconds: 75, rate: 1.08, volume: 0.68 },
] as const;

const AUDIO_ASSETS = {
  music: null as number | null,
  sfx: {
    flip: null as number | null,
    nearMiss: null as number | null,
    death: null as number | null,
    pickup: null as number | null,
    uiClick: null as number | null,
  },
};

class AudioController {
  private initialized = false;
  private available = true;
  private musicEnabled = true;
  private sfxEnabled = true;
  private musicSound: SoundInstance | null = null;
  private sfxSounds: Partial<Record<SfxType, SoundInstance>> = {};
  private expoAvModule: ExpoAvModule | null = null;

  private async loadExpoAv() {
    if (this.expoAvModule || !this.available) return this.expoAvModule;

    try {
      this.expoAvModule = await import('expo-av');
      return this.expoAvModule;
    } catch {
      this.available = false;
      return null;
    }
  }

  async init() {
    if (this.initialized || !this.available) return;

    const expoAv = await this.loadExpoAv();
    if (!expoAv) return;

    const { Audio, InterruptionModeAndroid, InterruptionModeIOS } = expoAv;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    if (AUDIO_ASSETS.music) {
      const { sound } = await Audio.Sound.createAsync(
        AUDIO_ASSETS.music,
        { isLooping: true, volume: 0, shouldPlay: this.musicEnabled },
      );
      this.musicSound = sound as SoundInstance;
    }

    for (const [key, asset] of Object.entries(AUDIO_ASSETS.sfx) as Array<[SfxType, number | null]>) {
      if (!asset) continue;
      const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false, volume: 0.9 });
      this.sfxSounds[key] = sound as SoundInstance;
    }

    this.initialized = true;
  }

  async setSettings({ music, sfx }: { music: boolean; sfx: boolean }) {
    this.musicEnabled = music;
    this.sfxEnabled = sfx;
    if (!this.initialized) await this.init();

    if (this.musicSound) {
      if (music) {
        await this.musicSound.setStatusAsync({ shouldPlay: true, volume: 0.5 });
      } else {
        await this.musicSound.setStatusAsync({ shouldPlay: false, volume: 0 });
      }
    }
  }

  async startMusic() {
    if (!this.initialized) await this.init();
    if (!this.musicSound || !this.musicEnabled) return;
    await this.musicSound.setStatusAsync({ shouldPlay: true });
  }

  async stopMusic() {
    if (!this.musicSound) return;
    await this.musicSound.setStatusAsync({ shouldPlay: false });
  }

  async updateMusicIntensity(survivalSeconds: number) {
    if (!this.musicEnabled || !this.musicSound) return;

    const target = [...MUSIC_INTENSITY_STAGES].reverse().find(s => survivalSeconds >= s.stageSeconds) || MUSIC_INTENSITY_STAGES[0];
    await this.musicSound.setStatusAsync({
      shouldPlay: true,
      volume: target.volume,
      rate: target.rate,
      shouldCorrectPitch: Platform.OS !== 'android',
    });
  }

  async playSfx(type: SfxType) {
    if (!this.sfxEnabled) return;
    if (!this.initialized) await this.init();
    const sound = this.sfxSounds[type];
    if (!sound) return;
    await sound.replayAsync();
  }

  async unload() {
    await this.musicSound?.unloadAsync();
    await Promise.all(Object.values(this.sfxSounds).map(sound => sound?.unloadAsync()));
    this.musicSound = null;
    this.sfxSounds = {};
    this.initialized = false;
  }
}

export const gameAudio = new AudioController();
