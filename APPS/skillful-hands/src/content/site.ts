export const site = {
  name: "Skillful Hands CIC",
  tagline: "Creating Skills. Building Futures.",
  email: "skillfulhandcic@gmail.com",
  canonical: "https://skillfulhandscic.uk/",
  description:
    "Skillful Hands CIC empowers young people and adults through practical hair education, confidence-building, employability, wellbeing, and entrepreneurship.",
  nav: [
    { label: "About", href: "#about" },
    { label: "Programmes", href: "#programmes" },
    { label: "Founder", href: "#founder" },
    { label: "Partner with us", href: "#partners" }
  ],
  outcomes: ["Practical hair education", "Confidence-building", "Routes towards work and enterprise"],
  programmes: [
    {
      number: "01",
      title: "Hair for Youth",
      audience: "For young people",
      description: "Hair education, confidence, creativity, and life skills in a supportive learning environment.",
      focus: ["Practical techniques", "Creative expression", "Personal confidence"]
    },
    {
      number: "02",
      title: "Women's Confidence Programme",
      audience: "For women",
      description: "Confidence-building, employability, and personal development shaped around individual goals.",
      focus: ["Self-belief", "Employability", "Personal development"]
    },
    {
      number: "03",
      title: "Beyond the Chair",
      audience: "For adults",
      description: "Hair, wellbeing, entrepreneurship, and economic opportunity brought together through practical learning.",
      focus: ["Wellbeing", "Enterprise thinking", "Economic opportunity"]
    }
  ],
  founder: {
    name: "Monique Hughes",
    title: "Founder, Skillful Hands CIC",
    paragraphs: [
      "Monique's background includes community development, youth engagement, event management, and social impact work across Canada and the United Kingdom.",
      "She created Skillful Hands to use hair as a practical tool for confidence, connection, creativity, and opportunity."
    ]
  },
  partners: [
    { title: "Schools and colleges", text: "Practical, confidence-building enrichment for young people." },
    { title: "Councils and community groups", text: "Accessible programmes shaped around local needs and opportunity." },
    { title: "Funders and corporate partners", text: "A practical route to support skills, wellbeing, and enterprise." }
  ]
} as const;
