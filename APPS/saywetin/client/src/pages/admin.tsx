import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Music, ArrowLeft, Eye } from "lucide-react";
import { Link } from "wouter";

interface ImportResult {
  success: boolean;
  songsImported: number;
  lyricsImported: number;
  errors?: string[];
}

interface ParsedSong {
  title: string;
  artist: string;
  language: string;
  languageName: string;
  licenseType: string;
  lyricsCount: number;
}

export default function Admin() {
  const [importData, setImportData] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  
  const parsedPreview = useMemo((): { songs: ParsedSong[]; errors: string[] } => {
    if (!importData.trim()) return { songs: [], errors: [] };
    
    const errors: string[] = [];
    const songs: ParsedSong[] = [];
    
    try {
      if (importFormat === "json") {
        let parsed = JSON.parse(importData);
        if (!Array.isArray(parsed)) parsed = [parsed];
        
        for (const song of parsed) {
          if (!song.title || !song.artist) {
            errors.push(`Missing title or artist for a song`);
            continue;
          }
          songs.push({
            title: song.title,
            artist: song.artist,
            language: song.language || '?',
            languageName: song.languageName || '?',
            licenseType: song.licenseType || '?',
            lyricsCount: Array.isArray(song.lyrics) ? song.lyrics.length : 0,
          });
        }
      } else if (importFormat === "csv") {
        const lines = importData.trim().split('\n');
        if (lines.length < 2) {
          errors.push("CSV must have header row and at least one data row");
        } else {
          const headers = lines[0].split(',').map(h => h.trim());
          const titleIdx = headers.indexOf('title');
          const artistIdx = headers.indexOf('artist');
          const langIdx = headers.indexOf('language');
          const langNameIdx = headers.indexOf('languageName');
          const licenseIdx = headers.indexOf('licenseType');
          
          const songMap = new Map<string, ParsedSong>();
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const title = values[titleIdx] || '';
            const artist = values[artistIdx] || '';
            const key = `${title}-${artist}`;
            
            if (!songMap.has(key) && title && artist) {
              songMap.set(key, {
                title,
                artist,
                language: values[langIdx] || '?',
                languageName: values[langNameIdx] || '?',
                licenseType: values[licenseIdx] || '?',
                lyricsCount: 1,
              });
            } else if (songMap.has(key)) {
              songMap.get(key)!.lyricsCount++;
            }
          }
          
          songs.push(...Array.from(songMap.values()));
        }
      }
    } catch (e: any) {
      errors.push(`Parse error: ${e.message}`);
    }
    
    return { songs, errors };
  }, [importData, importFormat]);

  const importMutation = useMutation({
    mutationFn: async (data: { format: string; data: string }) => {
      return await apiRequest("POST", "/api/admin/import-songs", data) as unknown as ImportResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Import successful",
          description: `Imported ${result.songsImported} songs with ${result.lyricsImported} lyric lines.`,
        });
        setImportData("");
        queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      } else {
        toast({
          title: "Import completed with errors",
          description: `Imported ${result.songsImported} songs. ${result.errors?.length || 0} errors occurred.`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "Failed to import songs. Please check your data format and try again.",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!importData.trim()) {
      toast({
        title: "No data provided",
        description: "Please enter song data to import.",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      format: importFormat,
      data: importData,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      
      // Auto-detect format from file extension
      if (file.name.endsWith('.json')) {
        setImportFormat("json");
      } else if (file.name.endsWith('.csv')) {
        setImportFormat("csv");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <Link href="/ops/live-lyrics">
          <Button variant="outline" size="sm" className="mb-4 ml-2" data-testid="button-open-live-lyrics-ops">
            Live lyrics
            <Badge className="ml-2" variant="secondary">NEW</Badge>
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Batch Import Tool</h1>
        <p className="text-muted-foreground">
          Import Public Domain and Creative Commons licensed African songs with lyrics
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Only songs with valid licenses (Public Domain, CC0, CC BY, CC BY-SA) can be imported.
          This tool is for building the library of freely-available African traditional music.
        </AlertDescription>
      </Alert>

      <Card className="p-6 mb-6">
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Import Format</Label>
            <div className="flex gap-3">
              <Button
                variant={importFormat === "json" ? "default" : "outline"}
                onClick={() => setImportFormat("json")}
                data-testid="button-format-json"
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant={importFormat === "csv" ? "default" : "outline"}
                onClick={() => setImportFormat("csv")}
                data-testid="button-format-csv"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="file-upload" className="text-base font-medium mb-3 block">
              Upload File
            </Label>
            <input
              id="file-upload"
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              data-testid="input-file"
            />
          </div>

          <div>
            <Label htmlFor="import-data" className="text-base font-medium mb-3 block">
              Or Paste Data
            </Label>
            <Textarea
              id="import-data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={
                importFormat === "json"
                  ? '[\n  {\n    "title": "Song Title",\n    "artist": "Artist Name",\n    "language": "zu",\n    "languageName": "Zulu",\n    "licenseType": "public_domain",\n    "coverImageUrl": "https://...",\n    "lyrics": [\n      {\n        "text": "Lyric line",\n        "startTime": "00:00",\n        "endTime": "00:04"\n      }\n    ]\n  }\n]'
                  : "title,artist,language,languageName,licenseType,coverImageUrl,lyricText,startTime,endTime\nSong Title,Artist Name,zu,Zulu,public_domain,https://...,Lyric line,00:00,00:04"
              }
              className="font-mono text-sm min-h-[400px]"
              data-testid="textarea-import-data"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!importData.trim()}
              className="flex-1"
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Hide Preview" : "Preview Data"}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !importData.trim()}
              className="flex-1"
              data-testid="button-import"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importMutation.isPending ? "Importing..." : "Import Songs"}
            </Button>
          </div>
        </div>
      </Card>

      {showPreview && importData.trim() && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Import Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parsedPreview.errors.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {parsedPreview.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {parsedPreview.songs.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {parsedPreview.songs.length} songs ready to import
                </div>
                <div className="divide-y max-h-[300px] overflow-y-auto">
                  {parsedPreview.songs.map((song, idx) => (
                    <div key={idx} className="py-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <Music className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{song.licenseType}</Badge>
                      <Badge variant="secondary" className="text-xs">{song.languageName}</Badge>
                      {song.lyricsCount > 0 && (
                        <Badge className="text-xs">{song.lyricsCount} lines</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No valid songs found in data</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">JSON Format Example</h2>
        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`[
  {
    "id": "song-example",
    "title": "Example Song",
    "artist": "Traditional",
    "language": "zu",
    "languageName": "Zulu",
    "licenseType": "public_domain",
    "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
    "coverImageUrl": "https://example.com/cover.jpg",
    "lyricsStorageAllowed": true,
    "userGeneratedMode": false,
    "lyrics": [
      {
        "id": "line-1",
        "text": "Shosholoza",
        "startTime": "00:00",
        "endTime": "00:03"
      }
    ]
  }
]`}
        </pre>

        <h2 className="text-lg font-semibold mb-3 mt-6">Valid License Types</h2>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><code>public_domain</code> - Public Domain songs</li>
          <li><code>cc0</code> - Creative Commons Zero (CC0 1.0)</li>
          <li><code>cc_by</code> - Creative Commons Attribution (CC BY 4.0)</li>
          <li><code>cc_by_sa</code> - Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)</li>
        </ul>
      </Card>
    </div>
  );
}
