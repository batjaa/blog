import {
  Html,
  Head,
  Body,
  Container,
  Font,
  Preview,
  Section,
  Hr,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const Layout = ({ preview, children }: LayoutProps) => {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Georgia"
          fallbackFontFamily="serif"
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Helvetica Neue"
          fallbackFontFamily="Helvetica"
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {children}
          <Footer />
        </Container>
      </Body>
    </Html>
  );
};

const Footer = () => (
  <Section style={footer}>
    <Hr style={divider} />
    <Text style={footerText}>
      You're receiving this because you subscribed to Batjaa's Newsletter.
    </Text>
    <Text style={footerText}>
      <Link href="{{unsubscribe_url}}" style={footerLink}>
        Unsubscribe
      </Link>
      {" · "}
      <Link href="https://batjaa.com/newsletter" style={footerLink}>
        View in browser
      </Link>
    </Text>
    <Text style={footerSignature}>
      With love from Bothell, WA
    </Text>
  </Section>
);

const body: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "40px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  margin: "0 auto",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const footer: React.CSSProperties = {
  padding: "32px 40px",
  backgroundColor: "#f9fafb",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  borderWidth: "1px",
  margin: "0 0 24px 0",
};

const footerText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px 0",
  textAlign: "center" as const,
};

const footerLink: React.CSSProperties = {
  color: "#6b7280",
  textDecoration: "underline",
};

const footerSignature: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  fontStyle: "italic",
  margin: "16px 0 0 0",
  textAlign: "center" as const,
};

export default Layout;
