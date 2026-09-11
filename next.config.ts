import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "@napi-rs/canvas", "pdfjs-dist"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
