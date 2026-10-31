import { Text, Link, Img, Section, Row, Column } from "react-email";
import * as React from "react";
import {
  Layout,
  newsletterCopy,
  formatIssueDate,
  type NewsletterLanguage,
  HeroSection,
  ContentSection,
  Paragraph,
  PlaceholderSection,
  TradingCard,
  ConsumptionGrid,
  BooksSection,
  ProjectsGrid,
} from "../components";

interface Movie {
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: string;
  comment?: string;
  imdbUrl: string;
}

interface Book {
  title: string;
  author: string;
  coverUrl?: string;
  status?: "reading" | "finished" | "abandoned";
  comment?: string;
  link?: string;
}

interface Trading {
  pnl: string;
  sentiment: "positive" | "negative" | "neutral";
  chartUrl?: string;
  summary?: string;
}

interface Project {
  name: string;
  url: string;
  description: string;
  imageUrl?: string;
}

interface Song {
  title: string;
  url: string;
  comment?: string;
}

interface NewsletterProps {
  language?: NewsletterLanguage;
  issueSlug?: string;
  web?: boolean;
  title: string;
  date: string;
  featuredImage?: string;
  greeting?: string;
  intro?: string;

  // Section content (HTML strings from markdown)
  familyContent?: string;
  professionalContent?: string;
  healthContent?: string;
  travelContent?: string;
  tradingContent?: string;
  closingContent?: string;
  randomThoughtsContent?: string;

  // Structured data
  trading?: Trading;
  movies?: Movie[];
  songs?: Song[];
  spotifyPlaylistUrl?: string;
  spotifyPlaylistName?: string;
  musicNote?: string;
  watchingNote?: string;
  books?: Book[];
  projects?: Project[];
}

// Default props for React Email preview
const previewProps: NewsletterProps = {
  title: "January 2026",
  date: "2026-01-01",
  featuredImage: "https://placehold.co/600x300/3b82f6/ffffff?text=Newsletter+Preview",
  greeting: "Hey everyone!",
  familyContent: "<p style=\"margin: 0 0 16px 0; line-height: 26px;\">This is a preview of the family section. Your actual content will appear here when you build the newsletter from markdown.</p>",
  professionalContent: "<p style=\"margin: 0 0 16px 0; line-height: 26px;\">Professional updates will go here. Talk about work, projects, and career highlights.</p>",
  trading: {
    pnl: "+$1,234",
    sentiment: "positive",
    chartUrl: "https://placehold.co/520x200/f0fdf4/059669?text=Trading+Chart",
    summary: "A brief summary of this month's trading activity.",
  },
  movies: [
    {
      title: "Example Movie",
      year: "2024",
      posterUrl: "https://placehold.co/100x150/1e293b/ffffff?text=Poster",
      rating: "8.5",
      comment: "Your thoughts about the movie go here.",
      imdbUrl: "https://www.imdb.com/title/tt1234567/",
    },
  ],
  spotifyPlaylistUrl: "https://open.spotify.com/playlist/example",
  spotifyPlaylistName: "January 2026 Vibes",
  books: [
    {
      title: "Example Book",
      author: "Author Name",
      status: "reading",
      comment: "Currently reading this one.",
    },
  ],
};

export const MonthlyNewsletter = (props: Partial<NewsletterProps> = {}) => {
  const language = props.language ?? "en";
  const copy = newsletterCopy[language];
  const isPreview = Object.keys(props).length === 0;
  const title = props.title ?? previewProps.title;
  const date = props.date ?? previewProps.date;
  const featuredImage = props.featuredImage ?? previewProps.featuredImage;
  const greeting = props.greeting ?? copy.greeting;
  const familyContent = props.familyContent ?? (isPreview ? previewProps.familyContent : undefined);
  const professionalContent = props.professionalContent ?? (isPreview ? previewProps.professionalContent : undefined);
  const healthContent = props.healthContent;
  const travelContent = props.travelContent;
  const trading = props.trading;
  const movies = props.movies ?? (isPreview ? previewProps.movies : []) ?? [];
  const songs = props.songs ?? [];
  const spotifyPlaylistUrl = props.spotifyPlaylistUrl;
  const spotifyPlaylistName = props.spotifyPlaylistName;
  const musicNote = props.musicNote;
  const watchingNote = props.watchingNote;
  const books = props.books ?? (isPreview ? previewProps.books : []) ?? [];
  const projects = props.projects ?? [];

  const formattedDate = formatIssueDate(date!, language);
  const previewText = `${title} - ${copy.preview}`;

  return (
    <Layout preview={previewText} language={language} issueSlug={props.issueSlug} web={props.web}>
      <HeroSection
        title={title}
        subtitle={formattedDate}
        imageUrl={featuredImage}
        imageAlt={copy.heroAlt}
      />

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greetingText}>{greeting}</Text>
        <Text style={introText}>
          {props.intro ?? copy.intro}
        </Text>
      </Section>

      {/* Family Section */}
      {familyContent ? (
        <ContentSection title={copy.family}>
          <div dangerouslySetInnerHTML={{ __html: familyContent }} />
        </ContentSection>
      ) : (
        <PlaceholderSection title={copy.family} language={language} />
      )}

      {/* Professional Section */}
      {professionalContent ? (
        <ContentSection title={copy.professional}>
          <div dangerouslySetInnerHTML={{ __html: professionalContent }} />
          {projects.length > 0 && <ProjectsGrid projects={projects} />}
        </ContentSection>
      ) : (
        <PlaceholderSection title={copy.professional} language={language} />
      )}

      {/* Trading Section */}
      {props.tradingContent && (
        <ContentSection title={copy.trading}>
          <div dangerouslySetInnerHTML={{ __html: props.tradingContent }} />
        </ContentSection>
      )}
      {trading && (
        <TradingCard
          language={language}
          pnl={trading.pnl}
          sentiment={trading.sentiment}
          chartUrl={trading.chartUrl}
          summary={trading.summary}
        />
      )}

      {/* Consumption Grid (Movies & Music) */}
      {(movies.length > 0 || songs.length > 0 || spotifyPlaylistUrl || musicNote || watchingNote) && (
        <ConsumptionGrid
          language={language}
          movies={movies}
          songs={songs}
          spotifyPlaylistUrl={spotifyPlaylistUrl}
          spotifyPlaylistName={spotifyPlaylistName}
          musicNote={musicNote}
          watchingNote={watchingNote}
        />
      )}

      {/* Books Section */}
      {books.length > 0 && <BooksSection books={books} language={language} />}

      {/* Health Section */}
      {healthContent ? (
        <ContentSection title={copy.health}>
          <div dangerouslySetInnerHTML={{ __html: healthContent }} />
        </ContentSection>
      ) : null}

      {/* Travel Section */}
      {travelContent ? (
        <ContentSection title={copy.travel}>
          <div dangerouslySetInnerHTML={{ __html: travelContent }} />
        </ContentSection>
      ) : null}

      {props.randomThoughtsContent && (
        <ContentSection title={copy.randomThoughts}>
          <div dangerouslySetInnerHTML={{ __html: props.randomThoughtsContent }} />
        </ContentSection>
      )}

      {/* Closing */}
      <Section style={closingSection}>
        {props.closingContent && (
          <div style={closingText} dangerouslySetInnerHTML={{ __html: props.closingContent }} />
        )}
        <Text style={closingText}>
          {copy.closing}
        </Text>
        <Text style={signatureText}>{copy.signature}</Text>
      </Section>
    </Layout>
  );
};

const greetingSection: React.CSSProperties = {
  padding: "32px 40px 24px 40px",
};

const greetingText: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0 0 8px 0",
};

const introText: React.CSSProperties = {
  fontSize: "16px",
  color: "#4b5563",
  margin: 0,
  lineHeight: "24px",
};

const closingSection: React.CSSProperties = {
  padding: "32px 40px",
  backgroundColor: "#f8fafc",
  borderTop: "1px solid #e5e7eb",
};

const closingText: React.CSSProperties = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const signatureText: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
  margin: 0,
  fontFamily: "Georgia, serif",
};

export default MonthlyNewsletter;
