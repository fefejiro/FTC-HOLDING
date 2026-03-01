import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ParentingTip } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { BookOpen, Filter } from "lucide-react";
// @ts-ignore
import { format } from "date-fns";
import { SEOHead } from "@/components/SEOHead";

const AGE_RANGES = [
  { label: "All Ages", value: "all" },
  { label: "Newborn (0-3 months)", value: "2" },
  { label: "Infant (4-11 months)", value: "8" },
  { label: "Toddler (1-2 years)", value: "18" },
  { label: "Preschool (3-5 years)", value: "48" },
  { label: "School Age (6-12 years)", value: "96" },
  { label: "Teen (13-17 years)", value: "168" },
];

const CATEGORIES = [
  { label: "All Categories", value: "all" },
  { label: "Development", value: "development" },
  { label: "Discipline", value: "discipline" },
  { label: "Nutrition", value: "nutrition" },
  { label: "Health", value: "health" },
  { label: "Education", value: "education" },
  { label: "Social Skills", value: "social-skills" },
  { label: "Safety", value: "safety" },
  { label: "Co-Parenting", value: "co-parenting" },
];

export default function ParentingTipsPage() {
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: tips = [], isLoading } = useQuery<ParentingTip[]>({
    queryKey: ["/api/parenting-tips", selectedAge, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAge && selectedAge !== "all") {
        params.append("childAgeMonths", selectedAge);
      }
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      const url = `/api/parenting-tips${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tips");
      return await res.json();
    },
  });

  return (
    <>
      <SEOHead title="Parenting Tips" description="Age-specific parenting guidance and expert advice" noindex />
      <div className="flex flex-col items-center w-full">
        <div className="p-4 sm:p-6 max-w-2xl w-full space-y-6 pb-20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">Parenting Tips</h1>
            </div>
          </div>

          <Card className="border-none shadow-sm bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Filter Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Child's Age</label>
                  <Select value={selectedAge} onValueChange={setSelectedAge}>
                    <SelectTrigger data-testid="select-age-filter">
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category-filter">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(selectedAge !== "all" || selectedCategory !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSelectedAge("all");
                    setSelectedCategory("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading tips...</p>
            </div>
          ) : tips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tips found for the selected filters. Try adjusting your filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6" data-testid="tips-list">
              {tips.map((tip) => (
                <Card key={tip.id} className="hover-elevate border-primary/5 overflow-hidden group" data-testid={`tip-card-${tip.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">{tip.title}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shadow-sm" data-testid={`badge-category-${tip.id}`}>
                            {tip.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Ages {Math.floor(parseInt(tip.ageMinMonths) / 12)}-{Math.ceil(parseInt(tip.ageMaxMonths) / 12)} years
                          </span>
                        </div>
                      </div>
                      {tip.imageUrl && (
                        <img
                          src={tip.imageUrl}
                          alt={tip.title}
                          className="w-24 h-24 object-cover rounded-md"
                          data-testid={`img-tip-${tip.id}`}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tip.excerpt && (
                      <p className="text-base text-foreground font-medium">{tip.excerpt}</p>
                    )}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">{tip.content}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {tip.author && <span>By {tip.author}</span>}
                        {tip.readTimeMinutes && <span>• {tip.readTimeMinutes} min read</span>}
                      </div>
                      {tip.publishedAt && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(tip.publishedAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
