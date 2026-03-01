interface ResourceSchemaProps {
  resource: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    website?: string;
    latitude?: string;
    longitude?: string;
    rating?: number;
    specialty: string;
    type: string;
    hours?: string;
    acceptsInsurance?: boolean;
  };
}

export function ResourceSchema({ resource }: ResourceSchemaProps) {
  // Only add schema for physical locations (not crisis or online-only)
  if (resource.type === 'crisis' || !resource.latitude || !resource.longitude) {
    return null;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": resource.type === 'therapist' ? "Psychologist" : "LocalBusiness",
    "name": resource.name,
    "description": resource.specialty,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": resource.address,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": resource.latitude,
      "longitude": resource.longitude
    },
    ...(resource.phone && { "telephone": resource.phone }),
    ...(resource.email && { "email": resource.email }),
    ...(resource.website && { "url": resource.website }),
    ...(resource.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": resource.rating,
        "bestRating": "5"
      }
    }),
    ...(resource.hours && { "openingHours": resource.hours }),
    ...(resource.acceptsInsurance && { "paymentAccepted": "Insurance" }),
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
