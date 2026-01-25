import { Section, Heading, Text, Img, Link, Row, Column } from "@react-email/components";
import * as React from "react";

interface Book {
  title: string;
  author: string;
  coverUrl?: string;
  status: "reading" | "finished" | "abandoned";
  comment?: string;
  link?: string;
}

interface BooksSectionProps {
  books: Book[];
}

export const BooksSection = ({ books }: BooksSectionProps) => {
  if (books.length === 0) {
    return null;
  }

  const statusConfig = {
    reading: { label: "Currently reading", color: "#2563eb", bg: "#dbeafe" },
    finished: { label: "Finished", color: "#059669", bg: "#d1fae5" },
    abandoned: { label: "DNF", color: "#6b7280", bg: "#f3f4f6" },
  };

  return (
    <Section style={sectionContainer}>
      <Heading as="h2" style={sectionTitle}>
        Reading
      </Heading>

      {books.map((book, index) => {
        const status = statusConfig[book.status];
        const placeholderCover = `https://placehold.co/80x120/1e293b/ffffff?text=${encodeURIComponent(book.title.slice(0, 8))}`;

        return (
          <Row key={index} style={bookRow}>
            <Column style={coverColumn}>
              {book.link ? (
                <Link href={book.link}>
                  <Img
                    src={book.coverUrl || placeholderCover}
                    alt={book.title}
                    width="70"
                    height="105"
                    style={coverImage}
                  />
                </Link>
              ) : (
                <Img
                  src={book.coverUrl || placeholderCover}
                  alt={book.title}
                  width="70"
                  height="105"
                  style={coverImage}
                />
              )}
            </Column>
            <Column style={bookInfoColumn}>
              <Text style={bookTitle}>
                {book.link ? (
                  <Link href={book.link} style={bookTitleLink}>
                    {book.title}
                  </Link>
                ) : (
                  book.title
                )}
              </Text>
              <Text style={bookAuthor}>by {book.author}</Text>
              <Text style={{ ...statusBadge, backgroundColor: status.bg, color: status.color }}>
                {status.label}
              </Text>
              {book.comment && <Text style={bookComment}>{book.comment}</Text>}
            </Column>
          </Row>
        );
      })}
    </Section>
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

const bookRow: React.CSSProperties = {
  marginBottom: "20px",
  paddingBottom: "20px",
  borderBottom: "1px solid #f3f4f6",
};

const coverColumn: React.CSSProperties = {
  width: "70px",
  verticalAlign: "top",
};

const coverImage: React.CSSProperties = {
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
};

const bookInfoColumn: React.CSSProperties = {
  paddingLeft: "16px",
  verticalAlign: "top",
};

const bookTitle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#1e293b",
  margin: "0 0 2px 0",
};

const bookTitleLink: React.CSSProperties = {
  color: "#1e293b",
  textDecoration: "none",
};

const bookAuthor: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 8px 0",
};

const statusBadge: React.CSSProperties = {
  display: "inline-block",
  fontSize: "11px",
  fontWeight: "500",
  padding: "2px 8px",
  borderRadius: "10px",
  margin: "0 0 8px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.3px",
};

const bookComment: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  lineHeight: "21px",
  margin: 0,
};

export default BooksSection;
