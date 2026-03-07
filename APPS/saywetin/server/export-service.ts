import type { Song, LyricLine } from "@shared/schema";

export interface ExportData {
  song: Song;
  lyrics: LyricLine[];
}

export class ExportService {
  /**
   * Export song data as JSON
   */
  static exportAsJSON(data: ExportData): string {
    const { song, lyrics } = data;
    
    const exportObj = {
      song: {
        title: song.title,
        artist: song.artist,
        language: song.language,
        languageName: song.languageName,
        licenseType: song.licenseType,
        licenseUrl: song.licenseUrl,
      },
      lyrics: lyrics.map(line => ({
        text: line.text,
        translation: line.translation,
        culturalMeaning: line.culturalMeaning,
        startTime: line.startTime,
        endTime: line.endTime,
        upvotes: line.upvotes,
        downvotes: line.downvotes,
      })),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportObj, null, 2);
  }

  /**
   * Export song data as plain text
   */
  static exportAsText(data: ExportData): string {
    const { song, lyrics } = data;
    
    let text = `${song.title}\n`;
    text += `Artist: ${song.artist}\n`;
    text += `Language: ${song.languageName} (${song.language})\n`;
    text += `License: ${song.licenseType}\n`;
    if (song.licenseUrl) {
      text += `License URL: ${song.licenseUrl}\n`;
    }
    text += `\n${"=".repeat(60)}\n\n`;

    lyrics.forEach((line, index) => {
      text += `[${index + 1}] ${line.text}\n`;
      if (line.translation) {
        text += `    Translation: ${line.translation}\n`;
      }
      if (line.culturalMeaning) {
        text += `    Cultural Meaning: ${line.culturalMeaning}\n`;
      }
      text += `\n`;
    });

    text += `\n${"=".repeat(60)}\n`;
    text += `Exported on ${new Date().toLocaleString()}\n`;
    text += `Source: Saywetin\n`;

    return text;
  }

  /**
   * Export song data as markdown
   */
  static exportAsMarkdown(data: ExportData): string {
    const { song, lyrics } = data;
    
    let markdown = `# ${song.title}\n\n`;
    markdown += `**Artist:** ${song.artist}  \n`;
    markdown += `**Language:** ${song.languageName} (${song.language})  \n`;
    markdown += `**License:** ${song.licenseType}  \n`;
    if (song.licenseUrl) {
      markdown += `**License URL:** [${song.licenseUrl}](${song.licenseUrl})  \n`;
    }
    markdown += `\n---\n\n`;

    lyrics.forEach((line, index) => {
      markdown += `### ${index + 1}. ${line.text}\n\n`;
      if (line.translation) {
        markdown += `**Translation:** ${line.translation}\n\n`;
      }
      if (line.culturalMeaning) {
        markdown += `**Cultural Meaning:** ${line.culturalMeaning}\n\n`;
      }
    });

    markdown += `\n---\n\n`;
    markdown += `*Exported on ${new Date().toLocaleString()}*  \n`;
    markdown += `*Source: Saywetin*\n`;

    return markdown;
  }
}
