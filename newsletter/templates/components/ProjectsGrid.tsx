import { Section, Text, Img, Link } from "@react-email/components";
import * as React from "react";

interface Project {
  name: string;
  url: string;
  description: string;
  imageUrl?: string;
}

interface ProjectsGridProps {
  projects: Project[];
}

export const ProjectsGrid = ({ projects }: ProjectsGridProps) => {
  if (projects.length === 0) return null;

  return (
    <Section>
      {projects.map((project, index) => {
        const domain = project.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return (
          <Section key={index} style={index < projects.length - 1 ? cardWithBorder : card}>
            <Link href={project.url}>
              <Img
                src={project.imageUrl || `https://placehold.co/520x273/1e293b/ffffff?text=${encodeURIComponent(project.name)}`}
                alt={project.name}
                width="520"
                style={projectImage}
              />
            </Link>
            <Link href={project.url} style={projectNameLink}>
              {project.name}
              <span style={arrow}> &#8599;</span>
            </Link>
            <Text style={projectDescription}>{project.description}</Text>
            <Link href={project.url} style={projectUrl}>{domain}</Link>
          </Section>
        );
      })}
    </Section>
  );
};

const card: React.CSSProperties = {
  marginBottom: "8px",
};

const cardWithBorder: React.CSSProperties = {
  marginBottom: "24px",
  paddingBottom: "24px",
  borderBottom: "1px solid #f3f4f6",
};

const projectImage: React.CSSProperties = {
  display: "block",
  borderRadius: "6px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  border: "1px solid #e5e7eb",
};

const projectNameLink: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: "600",
  color: "#2563eb",
  textDecoration: "underline",
  display: "block",
  marginTop: "12px",
  marginBottom: "4px",
};

const arrow: React.CSSProperties = {
  textDecoration: "none",
  display: "inline",
};

const projectDescription: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  lineHeight: "21px",
  margin: "0 0 4px 0",
};

const projectUrl: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  textDecoration: "none",
};
