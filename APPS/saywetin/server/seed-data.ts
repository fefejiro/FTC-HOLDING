import { storage } from "./storage";
import type { InsertSong, InsertLyricLine } from "@shared/schema";

export async function seedInitialData() {
  // Check if data already exists
  const existingSongs = await storage.getAllSongs();
  if (existingSongs.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding initial data...");

  // Public Domain Songs - Traditional African Folk Songs
  const song1 = await storage.createSong({
    title: "Siyahamba",
    artist: "Traditional Zulu",
    language: "zu",
    languageName: "Zulu",
    licenseType: "public_domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song1.id,
    startTime: "00:00",
    endTime: "00:08",
    text: "Siyahamba ekukhanyen' kwenkhos'",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song1.id,
    startTime: "00:09",
    endTime: "00:16",
    text: "Siyahamba ekukhanyen' kwenkhos'",
    translation: null,
    culturalMeaning: null,
  });

  const song2 = await storage.createSong({
    title: "Thula Baba",
    artist: "Traditional Xhosa",
    language: "xh",
    languageName: "Xhosa",
    licenseType: "public_domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song2.id,
    startTime: "00:00",
    endTime: "00:05",
    text: "Thula baba, thula sana",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song2.id,
    startTime: "00:06",
    endTime: "00:12",
    text: "Uzobuya ekuseni",
    translation: null,
    culturalMeaning: null,
  });

  const song3 = await storage.createSong({
    title: "Shosholoza",
    artist: "Traditional Ndebele",
    language: "nd",
    languageName: "Ndebele",
    licenseType: "public_domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song3.id,
    startTime: "00:00",
    endTime: "00:06",
    text: "Shosholoza, kulezo ntaba",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song3.id,
    startTime: "00:07",
    endTime: "00:13",
    text: "Stimela siphume South Africa",
    translation: null,
    culturalMeaning: null,
  });

  // Yoruba folk songs
  const song4 = await storage.createSong({
    title: "Ololufe Mi",
    artist: "Traditional Yoruba",
    language: "yo",
    languageName: "Yoruba",
    licenseType: "public_domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song4.id,
    startTime: "00:00",
    endTime: "00:05",
    text: "Ololufe mi, mo n pe o",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song4.id,
    startTime: "00:06",
    endTime: "00:12",
    text: "Wa ba mi, ko ma je ki n duro",
    translation: null,
    culturalMeaning: null,
  });

  // Igbo traditional song
  const song5 = await storage.createSong({
    title: "Onye Nwe Anyi",
    artist: "Traditional Igbo",
    language: "ig",
    languageName: "Igbo",
    licenseType: "public_domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song5.id,
    startTime: "00:00",
    endTime: "00:07",
    text: "Onye nwe anyi, bu Chukwu",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song5.id,
    startTime: "00:08",
    endTime: "00:14",
    text: "O na-elekota anyi kwa mgbe",
    translation: null,
    culturalMeaning: null,
  });

  // Creative Commons songs
  const song6 = await storage.createSong({
    title: "Ubuntu Spirit",
    artist: "Community Collective",
    language: "en",
    languageName: "English (African Context)",
    licenseType: "cc_by",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song6.id,
    startTime: "00:00",
    endTime: "00:06",
    text: "I am because we are, together we stand",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song6.id,
    startTime: "00:07",
    endTime: "00:13",
    text: "Ubuntu flows through our land",
    translation: null,
    culturalMeaning: null,
  });

  // Swahili Creative Commons song
  const song7 = await storage.createSong({
    title: "Jambo Rafiki",
    artist: "East African Voices",
    language: "sw",
    languageName: "Swahili",
    licenseType: "cc_by_sa",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    lyricsStorageAllowed: true,
    coverArtUrl: null,
    userGeneratedMode: false,
  });

  await storage.createLyricLine({
    songId: song7.id,
    startTime: "00:00",
    endTime: "00:05",
    text: "Jambo rafiki, habari yako?",
    translation: null,
    culturalMeaning: null,
  });

  await storage.createLyricLine({
    songId: song7.id,
    startTime: "00:06",
    endTime: "00:11",
    text: "Karibu nyumbani, karibu sana",
    translation: null,
    culturalMeaning: null,
  });

  // User-generated mode song (for testing user lyric input)
  const song8 = await storage.createSong({
    title: "Modern Afrobeats Hit",
    artist: "Contemporary Artist",
    language: "yo",
    languageName: "Yoruba",
    licenseType: "user_generated",
    licenseUrl: null,
    lyricsStorageAllowed: false,
    coverArtUrl: null,
    userGeneratedMode: true,
  });

  console.log("✅ Seeded 8 songs with lyric lines");
  console.log("- 5 Public Domain traditional songs");
  console.log("- 2 Creative Commons licensed songs");
  console.log("- 1 User-generated mode song");
}
