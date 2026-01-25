import { Section, Img, Heading, Text } from "@react-email/components";
import * as React from "react";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
}

const DEFAULT_HERO_IMAGE = "https://placehold.co/600x300/e2e8f0/64748b?text=Family+Photo";

export const HeroSection = ({
  title,
  subtitle,
  imageUrl,
  imageAlt = "Newsletter hero image",
}: HeroSectionProps) => {
  return (
    <Section style={heroContainer}>
      <Img
        src={imageUrl || DEFAULT_HERO_IMAGE}
        alt={imageAlt}
        width="600"
        height="300"
        style={heroImage}
      />
      <Section style={heroOverlay}>
        <Heading as="h1" style={heroTitle}>
          {title}
        </Heading>
        {subtitle && <Text style={heroSubtitle}>{subtitle}</Text>}
      </Section>
    </Section>
  );
};

const heroContainer: React.CSSProperties = {
  position: "relative" as const,
  margin: 0,
  padding: 0,
};

const heroImage: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  objectFit: "cover" as const,
};

const heroOverlay: React.CSSProperties = {
  backgroundColor: "rgba(15, 23, 42, 0.75)",
  padding: "32px 40px",
  marginTop: "-100px",
  position: "relative" as const,
};

const heroTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "700",
  fontFamily: "Georgia, serif",
  margin: "0 0 8px 0",
  lineHeight: "1.2",
};

const heroSubtitle: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "16px",
  margin: 0,
  fontWeight: "400",
};

export default HeroSection;
