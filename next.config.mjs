/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist needs to stay as external in serverless functions
  // (avoids bundling issues with its ESM worker files)
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
          },
          {
            // CSP: allow self, Clerk auth, HeyGen streaming, Vercel analytics,
            // Stripe checkout, and inline styles (needed for Tailwind)
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.salesblitz.ai https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://*.gravatar.com https://*.googleusercontent.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.dev https://clerk.salesblitz.ai https://api.heygen.com wss://*.heygen.com https://api.anthropic.com https://api.openai.com https://*.supabase.co https://*.stripe.com https://*.vercel-insights.com https://*.vercel-analytics.com",
              "frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
