import { Section, Heading, Text, Img, Link, Row, Column } from "@react-email/components";
import * as React from "react";

interface Movie {
  title: string;
  year?: string;
  posterUrl?: string;
  rating?: string;
  comment: string;
  imdbUrl: string;
}

interface ConsumptionGridProps {
  movies?: Movie[];
  spotifyPlaylistUrl?: string;
  spotifyPlaylistName?: string;
}

export const ConsumptionGrid = ({
  movies = [],
  spotifyPlaylistUrl,
  spotifyPlaylistName,
}: ConsumptionGridProps) => {
  if (movies.length === 0 && !spotifyPlaylistUrl) {
    return null;
  }

  return (
    <Section style={sectionContainer}>
      <Heading as="h2" style={sectionTitle}>
        What I've Been Watching & Listening To
      </Heading>

      {movies.length > 0 && (
        <Section style={moviesSection}>
          {movies.map((movie, index) => (
            <MovieCard key={index} movie={movie} />
          ))}
        </Section>
      )}

      {spotifyPlaylistUrl && (
        <Section style={spotifySection}>
          <Row>
            <Column style={spotifyIconCol}>
              <Img
                src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg"
                alt="Spotify"
                width="32"
                height="32"
              />
            </Column>
            <Column style={spotifyTextCol}>
              <Text style={spotifyLabel}>This month's playlist</Text>
              <Link href={spotifyPlaylistUrl} style={spotifyLink}>
                {spotifyPlaylistName || "Listen on Spotify"}
              </Link>
            </Column>
          </Row>
        </Section>
      )}
    </Section>
  );
};

const MovieCard = ({ movie }: { movie: Movie }) => {
  const placeholderPoster = `https://placehold.co/120x180/1e293b/64748b?text=${encodeURIComponent(movie.title.slice(0, 10))}`;

  return (
    <Row style={movieRow}>
      <Column style={posterColumn}>
        <Link href={movie.imdbUrl}>
          <Img
            src={movie.posterUrl || placeholderPoster}
            alt={movie.title}
            width="100"
            height="150"
            style={posterImage}
          />
        </Link>
      </Column>
      <Column style={movieInfoColumn}>
        <Link href={movie.imdbUrl} style={movieTitleLink}>
          {movie.title}
          {movie.year && <span style={movieYear}> ({movie.year})</span>}
        </Link>
        {movie.rating && (
          <Text style={movieRating}>
            <span style={starIcon}>★</span> {movie.rating}
          </Text>
        )}
        <Text style={movieComment}>{movie.comment}</Text>
      </Column>
    </Row>
  );
};

const sectionContainer: React.CSSProperties = {
  padding: "32px 40px",
  borderBottom: "1px solid #e5e7eb",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0 0 20px 0",
  fontFamily: "Georgia, serif",
};

const moviesSection: React.CSSProperties = {
  marginBottom: "24px",
};

const movieRow: React.CSSProperties = {
  marginBottom: "20px",
  paddingBottom: "20px",
  borderBottom: "1px solid #f3f4f6",
};

const posterColumn: React.CSSProperties = {
  width: "100px",
  verticalAlign: "top",
};

const posterImage: React.CSSProperties = {
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const movieInfoColumn: React.CSSProperties = {
  paddingLeft: "16px",
  verticalAlign: "top",
};

const movieTitleLink: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e293b",
  textDecoration: "none",
  display: "block",
  marginBottom: "4px",
};

const movieYear: React.CSSProperties = {
  fontWeight: "400",
  color: "#6b7280",
};

const movieRating: React.CSSProperties = {
  fontSize: "14px",
  color: "#f59e0b",
  margin: "0 0 8px 0",
};

const starIcon: React.CSSProperties = {
  color: "#f59e0b",
};

const movieComment: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  lineHeight: "21px",
  margin: 0,
};

const spotifySection: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px",
};

const spotifyIconCol: React.CSSProperties = {
  width: "48px",
  verticalAlign: "middle",
};

const spotifyTextCol: React.CSSProperties = {
  verticalAlign: "middle",
};

const spotifyLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 2px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const spotifyLink: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#059669",
  textDecoration: "none",
};

export default ConsumptionGrid;
