import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  songId: string;
  songTitle: string;
}

export function ExportButton({ songId, songTitle }: ExportButtonProps) {
  const handleExport = async (format: "json" | "text" | "markdown") => {
    try {
      const response = await fetch(getApiUrl(`/api/songs/${songId}/export/${format}`));
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const extension = format === "markdown" ? "md" : format === "json" ? "json" : "txt";
      a.download = `${songTitle.replace(/[^a-z0-9]/gi, "_")}_lyrics.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          data-testid="menu-export-json"
        >
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("text")}
          data-testid="menu-export-text"
        >
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("markdown")}
          data-testid="menu-export-markdown"
        >
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
