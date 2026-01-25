import { Section, Heading, Text, Img, Row, Column } from "@react-email/components";
import * as React from "react";

interface TradingCardProps {
  pnl: string;
  sentiment: "positive" | "negative" | "neutral";
  chartUrl?: string;
  summary?: string;
}

export const TradingCard = ({
  pnl,
  sentiment,
  chartUrl,
  summary,
}: TradingCardProps) => {
  const sentimentConfig = {
    positive: { color: "#059669", bg: "#d1fae5", label: "Good month" },
    negative: { color: "#dc2626", bg: "#fee2e2", label: "Rough month" },
    neutral: { color: "#6b7280", bg: "#f3f4f6", label: "Flat month" },
  };

  const config = sentimentConfig[sentiment];
  const isPositive = pnl.startsWith("+") || (!pnl.startsWith("-") && sentiment === "positive");

  return (
    <Section style={sectionContainer}>
      <Heading as="h2" style={sectionTitle}>
        Trading Update
      </Heading>

      <Section style={cardContainer}>
        <Row>
          <Column style={pnlColumn}>
            <Text style={pnlLabel}>Month P&L</Text>
            <Text
              style={{
                ...pnlValue,
                color: isPositive ? "#059669" : pnl.startsWith("-") ? "#dc2626" : "#374151",
              }}
            >
              {pnl}
            </Text>
            <Text style={{ ...sentimentBadge, backgroundColor: config.bg, color: config.color }}>
              {config.label}
            </Text>
          </Column>
        </Row>

        {chartUrl && (
          <Row style={chartRow}>
            <Column>
              <Img
                src={chartUrl}
                alt="Monthly trading chart"
                width="520"
                style={chartImage}
              />
            </Column>
          </Row>
        )}

        {summary && (
          <Row>
            <Column>
              <Text style={summaryText}>{summary}</Text>
            </Column>
          </Row>
        )}
      </Section>
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
  margin: "0 0 16px 0",
  fontFamily: "Georgia, serif",
};

const cardContainer: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "24px",
  border: "1px solid #e2e8f0",
};

const pnlColumn: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "0 0 16px 0",
};

const pnlLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const pnlValue: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: "700",
  margin: "0 0 8px 0",
  fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
};

const sentimentBadge: React.CSSProperties = {
  display: "inline-block",
  fontSize: "12px",
  fontWeight: "500",
  padding: "4px 12px",
  borderRadius: "12px",
  margin: 0,
};

const chartRow: React.CSSProperties = {
  padding: "16px 0",
};

const chartImage: React.CSSProperties = {
  width: "100%",
  height: "auto",
  borderRadius: "4px",
};

const summaryText: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  lineHeight: "22px",
  margin: 0,
  fontStyle: "italic",
};

export default TradingCard;
