/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://hondius-watch.com",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: "/api/" },
    ],
  },
  exclude: ["/api/*"],
  changefreq: "daily",
  priority: 0.7,
  additionalPaths: async () => [
    { loc: "/", changefreq: "daily", priority: 1.0 },
    { loc: "/outbreak/hondius-2026", changefreq: "daily", priority: 0.9 },
    { loc: "/outbreak/hondius-2026/timeline", changefreq: "daily", priority: 0.8 },
    { loc: "/outbreak/hondius-2026/cases", changefreq: "daily", priority: 0.8 },
    { loc: "/pathogen/hantavirus", changefreq: "weekly", priority: 0.7 },
    { loc: "/about", changefreq: "monthly", priority: 0.5 },
  ],
};
