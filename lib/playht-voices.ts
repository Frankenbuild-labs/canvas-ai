/**
 * PlayHT Pre-Built Voice Catalog (Static Database)
 * Last Updated: Feb 16, 2024
 * 
 * This is a static snapshot of PlayHT's 800+ voice library.
 * Sample URLs are publicly accessible on S3 and work independently of PlayHT API.
 * 
 * We use this for voice browsing/preview, while actual TTS generation
 * happens through Fish Speech for best quality + emotion control.
 */

export interface PlayHTVoice {
  id: string;
  name: string;
  sample: string;
  accent: string;
  age: string;
  gender: string;
  language: string;
  language_code: string;
  loudness: string;
  style: string;
  tempo: string;
  texture: string;
  is_cloned: boolean;
  voice_engine: string;
}

export const PLAYHT_VOICES: PlayHTVoice[] = [
  {
    id: "s3://voice-cloning-zero-shot/d82d246c-148b-457f-9668-37b789520891/adolfosaad/manifest.json",
    name: "Adolfo",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/adolfo.wav",
    accent: "american",
    age: "adult",
    gender: "male",
    language: "English (US)",
    language_code: "en-US",
    loudness: "neutral",
    style: "narrative",
    tempo: "fast",
    texture: "thick",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/a59cb96d-bba8-4e24-81f2-e60b888a0275/charlottenarrativesaad/manifest.json",
    name: "Charlotte (Narrative)",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/charlotte+(narrative).wav",
    accent: "canadian",
    age: "adult",
    gender: "female",
    language: "English (CA)",
    language_code: "en-CA",
    loudness: "low",
    style: "narrative",
    tempo: "neutral",
    texture: "smooth",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/3a831d1f-2183-49de-b6d8-33f16b2e9867/dylansaad/manifest.json",
    name: "Dylan",
    sample: "https://peregrine-results.s3.amazonaws.com/AAc418f41vBRkHNOdi.mp3",
    accent: "british",
    age: "old",
    gender: "male",
    language: "English (US)",
    language_code: "en-US",
    loudness: "high",
    style: "gaming",
    tempo: "slow",
    texture: "smooth",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/f6594c50-e59b-492c-bac2-047d57f8bdd8/susanadvertisingsaad/manifest.json",
    name: "Susan (Advertising)",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/susan+(advertising).wav",
    accent: "american",
    age: "adult",
    gender: "female",
    language: "English (US)",
    language_code: "en-US",
    loudness: "high",
    style: "advertising",
    tempo: "neutral",
    texture: "round",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/e5df2eb3-5153-40fa-9f6e-6e27bbb7a38e/original/manifest.json",
    name: "Navya",
    sample: "https://parrot-samples.s3.amazonaws.com/gargamel/Navya.wav",
    accent: "indian",
    age: "",
    gender: "female",
    language: "English (IN)",
    language_code: "en-IN",
    loudness: "",
    style: "",
    tempo: "",
    texture: "",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/b41d1a8c-2c99-4403-8262-5808bc67c3e0/bentonsaad/manifest.json",
    name: "Benton",
    sample: "https://peregrine-results.s3.amazonaws.com/fPBgu4E0dT9eMkxIe0.mp3",
    accent: "american",
    age: "old",
    gender: "male",
    language: "English (US)",
    language_code: "en-US",
    loudness: "high",
    style: "videos",
    tempo: "fast",
    texture: "smooth",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/9fc626dc-f6df-4f47-a112-39461e8066aa/oliviaadvertisingsaad/manifest.json",
    name: "Olivia (Advertising)",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/olivia+advertising.wav",
    accent: "canadian",
    age: "",
    gender: "female",
    language: "English (CA)",
    language_code: "en-CA",
    loudness: "",
    style: "advertising",
    tempo: "",
    texture: "",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/1afba232-fae0-4b69-9675-7f1aac69349f/delilahsaad/manifest.json",
    name: "Delilah",
    sample: "https://peregrine-results.s3.amazonaws.com/UlI3kAAfgCOJNP2OMe.mp3",
    accent: "american",
    age: "adult",
    gender: "female",
    language: "English (US)",
    language_code: "en-US",
    loudness: "neutral",
    style: "narrative",
    tempo: "slow",
    texture: "smooth",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/9f1ee23a-9108-4538-90be-8e62efc195b6/charlessaad/manifest.json",
    name: "Charles",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/charles.wav",
    accent: "american",
    age: "adult",
    gender: "male",
    language: "English (US)",
    language_code: "en-US",
    loudness: "neutral",
    style: "narrative",
    tempo: "neutral",
    texture: "round",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/473c81b1-93ea-4662-9e63-7d65392e5f9b/madisonsaad/manifest.json",
    name: "Madison",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/madison.wav",
    accent: "irish",
    age: "old",
    gender: "female",
    language: "English (IE)",
    language_code: "en-IE",
    loudness: "neutral",
    style: "narrative",
    tempo: "slow",
    texture: "round",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/2879ab87-3775-4992-a228-7e4f551658c2/fredericksaad2/manifest.json",
    name: "Frederick",
    sample: "https://peregrine-results.s3.amazonaws.com/rixIUBC2k3d0xHY4B2.mp3",
    accent: "british",
    age: "adult",
    gender: "male",
    language: "English (GB)",
    language_code: "en-GB",
    loudness: "low",
    style: "narrative",
    tempo: "slow",
    texture: "thick",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/a540a448-a9ca-446c-9538-d1bae6c506f1/original/manifest.json",
    name: "Mason",
    sample: "https://parrot-samples.s3.amazonaws.com/gargamel/Mason.wav",
    accent: "american",
    age: "",
    gender: "male",
    language: "English (US)",
    language_code: "en-US",
    loudness: "",
    style: "",
    tempo: "",
    texture: "",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/a5cc7dd9-069c-4fe8-9ae7-0c4bae4779c5/micahsaad/manifest.json",
    name: "Micah",
    sample: "https://parrot-samples.s3.amazonaws.com/kettle/micah.wav",
    accent: "british",
    age: "adult",
    gender: "female",
    language: "English (US)",
    language_code: "en-US",
    loudness: "neutral",
    style: "narrative",
    tempo: "neutral",
    texture: "smooth",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  },
  {
    id: "s3://voice-cloning-zero-shot/d99d35e6-e625-4fa4-925a-d65172d358e1/adriansaad/manifest.json",
    name: "Adrian",
    sample: "https://peregrine-results.s3.amazonaws.com/0hjUhtQD61YXtW39OP.mp3",
    accent: "american",
    age: "old",
    gender: "male",
    language: "English (US)",
    language_code: "en-US",
    loudness: "neutral",
    style: "narrative",
    tempo: "fast",
    texture: "thick",
    is_cloned: false,
    voice_engine: "PlayHT2.0"
  }
];

/**
 * Helper functions for filtering and searching voices
 */

export function getVoicesByGender(gender: string): PlayHTVoice[] {
  return PLAYHT_VOICES.filter(v => v.gender.toLowerCase() === gender.toLowerCase());
}

export function getVoicesByAccent(accent: string): PlayHTVoice[] {
  return PLAYHT_VOICES.filter(v => v.accent.toLowerCase() === accent.toLowerCase());
}

export function getVoicesByStyle(style: string): PlayHTVoice[] {
  return PLAYHT_VOICES.filter(v => v.style.toLowerCase() === style.toLowerCase());
}

export function searchVoices(query: string): PlayHTVoice[] {
  const lowerQuery = query.toLowerCase();
  return PLAYHT_VOICES.filter(v => 
    v.name.toLowerCase().includes(lowerQuery) ||
    v.accent.toLowerCase().includes(lowerQuery) ||
    v.gender.toLowerCase().includes(lowerQuery) ||
    v.style.toLowerCase().includes(lowerQuery) ||
    v.language.toLowerCase().includes(lowerQuery)
  );
}

export function getVoiceById(id: string): PlayHTVoice | undefined {
  return PLAYHT_VOICES.find(v => v.id === id);
}

export function getVoiceByName(name: string): PlayHTVoice | undefined {
  return PLAYHT_VOICES.find(v => v.name === name);
}

// Export metadata for filtering UI
export const UNIQUE_ACCENTS = [...new Set(PLAYHT_VOICES.map(v => v.accent).filter(Boolean))].sort();
export const UNIQUE_GENDERS = [...new Set(PLAYHT_VOICES.map(v => v.gender).filter(Boolean))].sort();
export const UNIQUE_STYLES = [...new Set(PLAYHT_VOICES.map(v => v.style).filter(Boolean))].sort();
export const UNIQUE_AGES = [...new Set(PLAYHT_VOICES.map(v => v.age).filter(Boolean))].sort();
export const UNIQUE_LANGUAGES = [...new Set(PLAYHT_VOICES.map(v => v.language).filter(Boolean))].sort();
