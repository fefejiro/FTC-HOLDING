import { Badge } from "@/components/ui/badge";
import type { LicenseType } from "@shared/schema";

interface LicenseBadgeProps {
  licenseType: LicenseType;
  className?: string;
}

const licenseLabels: Record<LicenseType, string> = {
  public_domain: "Public Domain",
  cc0: "CC0",
  cc_by: "CC BY",
  cc_by_sa: "CC BY-SA",
  user_generated: "User Generated",
};

const licenseColors: Record<LicenseType, string> = {
  public_domain: "bg-license-public-domain text-license-public-domain-foreground",
  cc0: "bg-license-creative-commons text-license-creative-commons-foreground",
  cc_by: "bg-license-creative-commons text-license-creative-commons-foreground",
  cc_by_sa: "bg-license-creative-commons text-license-creative-commons-foreground",
  user_generated: "bg-license-user-generated text-license-user-generated-foreground",
};

export function LicenseBadge({ licenseType, className }: LicenseBadgeProps) {
  return (
    <Badge
      className={`${licenseColors[licenseType]} ${className}`}
      data-testid={`badge-license-${licenseType}`}
    >
      {licenseLabels[licenseType]}
    </Badge>
  );
}
