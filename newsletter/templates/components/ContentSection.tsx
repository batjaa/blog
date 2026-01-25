import { Section, Heading, Text } from "@react-email/components";
import * as React from "react";

interface ContentSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export const ContentSection = ({ title, icon, children }: ContentSectionProps) => {
  return (
    <Section style={sectionContainer}>
      <Heading as="h2" style={sectionTitle}>
        {icon && <span style={iconStyle}>{icon}</span>}
        {title}
      </Heading>
      <div style={sectionContent}>{children}</div>
    </Section>
  );
};

interface ParagraphProps {
  children: React.ReactNode;
}

export const Paragraph = ({ children }: ParagraphProps) => (
  <Text style={paragraphStyle}>{children}</Text>
);

interface PlaceholderProps {
  title: string;
  icon?: string;
}

export const PlaceholderSection = ({ title, icon }: PlaceholderProps) => (
  <Section style={sectionContainer}>
    <Heading as="h2" style={sectionTitle}>
      {icon && <span style={iconStyle}>{icon}</span>}
      {title}
    </Heading>
    <Text style={placeholderText}>Nothing new this month!</Text>
  </Section>
);

const sectionContainer: React.CSSProperties = {
  padding: "32px 40px",
  borderBottom: "1px solid #e5e7eb",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0 0 16px 0",
  fontFamily: "Georgia, serif",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const iconStyle: React.CSSProperties = {
  fontSize: "20px",
  marginRight: "8px",
};

const sectionContent: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
};

const paragraphStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
  margin: "0 0 16px 0",
};

const placeholderText: React.CSSProperties = {
  fontSize: "15px",
  color: "#9ca3af",
  fontStyle: "italic",
  margin: 0,
};

export default ContentSection;
