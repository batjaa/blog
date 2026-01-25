import { Text, Link, Img, Section, Row, Column } from "@react-email/components";
import * as React from "react";
import {
  Layout,
  HeroSection,
  ContentSection,
  Paragraph,
  PlaceholderSection,
  TradingCard,
  ConsumptionGrid,
  BooksSection,
} from "../components";

interface Movie {
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: string;
  comment: string;
  imdbUrl: string;
}

interface Book {
  title: string;
  author: string;
  coverUrl?: string;
  status: "reading" | "finished" | "abandoned";
  comment?: string;
  link?: string;
}

interface Trading {
  pnl: string;
  sentiment: "positive" | "negative" | "neutral";
  chartUrl?: string;
  summary?: string;
}

interface NewsletterProps {
  title: string;
  date: string;
  featuredImage?: string;
  greeting?: string;

  // Section content (HTML strings from markdown)
  familyContent?: string;
  professionalContent?: string;
  healthContent?: string;
  travelContent?: string;

  // Structured data
  trading?: Trading;
  movies?: Movie[];
  spotifyPlaylistUrl?: string;
  spotifyPlaylistName?: string;
  books?: Book[];
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

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
  const title = props.title ?? previewProps.title;
  const date = props.date ?? previewProps.date;
  const featuredImage = props.featuredImage ?? previewProps.featuredImage;
  const greeting = props.greeting ?? previewProps.greeting;
  const familyContent = props.familyContent ?? previewProps.familyContent;
  const professionalContent = props.professionalContent ?? previewProps.professionalContent;
  const healthContent = props.healthContent;
  const travelContent = props.travelContent;
  const trading = props.trading ?? previewProps.trading;
  const movies = props.movies ?? previewProps.movies;
  const spotifyPlaylistUrl = props.spotifyPlaylistUrl ?? previewProps.spotifyPlaylistUrl;
  const spotifyPlaylistName = props.spotifyPlaylistName ?? previewProps.spotifyPlaylistName;
  const books = props.books ?? previewProps.books;

  const formattedDate = formatDate(date!);
  const previewText = `${title} - Updates from the Batjaa family`;

  return (
    <Layout preview={previewText}>
      <HeroSection
        title={title}
        subtitle={formattedDate}
        imageUrl={featuredImage}
      />

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greetingText}>{greeting}</Text>
        <Text style={introText}>
          Here's what's been happening in our world this month.
        </Text>
      </Section>

      {/* Family Section */}
      {familyContent ? (
        <ContentSection title="Family">
          <div dangerouslySetInnerHTML={{ __html: familyContent }} />
        </ContentSection>
      ) : (
        <PlaceholderSection title="Family" />
      )}

      {/* Professional Section */}
      {professionalContent ? (
        <ContentSection title="Professional">
          <div dangerouslySetInnerHTML={{ __html: professionalContent }} />
        </ContentSection>
      ) : (
        <PlaceholderSection title="Professional" />
      )}

      {/* Trading Section */}
      {trading ? (
        <TradingCard
          pnl={trading.pnl}
          sentiment={trading.sentiment}
          chartUrl={trading.chartUrl}
          summary={trading.summary}
        />
      ) : (
        <PlaceholderSection title="Trading Update" />
      )}

      {/* Consumption Grid (Movies & Music) */}
      {((movies ?? []).length > 0 || spotifyPlaylistUrl) && (
        <ConsumptionGrid
          movies={movies ?? []}
          spotifyPlaylistUrl={spotifyPlaylistUrl}
          spotifyPlaylistName={spotifyPlaylistName}
        />
      )}

      {/* Books Section */}
      {(books ?? []).length > 0 && <BooksSection books={books ?? []} />}

      {/* Health Section */}
      {healthContent ? (
        <ContentSection title="Health & Fitness">
          <div dangerouslySetInnerHTML={{ __html: healthContent }} />
        </ContentSection>
      ) : null}

      {/* Travel Section */}
      {travelContent ? (
        <ContentSection title="Travel & Adventures">
          <div dangerouslySetInnerHTML={{ __html: travelContent }} />
        </ContentSection>
      ) : null}

      {/* Closing */}
      <Section style={closingSection}>
        <Text style={closingText}>
          Thanks for reading! Reply to this email if you want to say hi - I read
          every response.
        </Text>
        <Text style={signatureText}>— Batjaa</Text>
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
