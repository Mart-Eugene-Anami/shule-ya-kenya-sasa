import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "Score – School Management System";
const DEFAULT_DESCRIPTION =
  "Streamline school operations with Score. Manage students, teachers, exams, attendance, analytics, and timetables in one modern platform.";

const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  noindex = false,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | Score` : SITE_NAME;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
