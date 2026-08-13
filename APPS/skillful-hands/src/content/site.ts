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
  outcomes: ["Practical skills", "Real conversations", "Stronger futures"],
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
  showcase: [
    {
      label: "Youth",
      title: "Hair for Youth",
      audience: "Ages 13 to 25",
      description: "Hands-on hair education that builds practical skills, confidence and brighter futures.",
      focus: ["Practical hair skills", "Real conversations", "Future readiness"],
      tone: "orange"
    },
    {
      label: "Women",
      title: "Women's Confidence Programme",
      audience: "Women 18+",
      description: "Hair skills, personal development and supportive conversations shaped around each participant's goals.",
      focus: ["Confidence and identity", "Employability", "Enterprise thinking"],
      tone: "red"
    },
    {
      label: "Adults",
      title: "Beyond the Chair",
      audience: "Adults 18+",
      description: "A community programme using hair education to create connection, wellbeing and personal growth.",
      focus: ["Connection", "Wellbeing", "Personal growth"],
      tone: "green"
    },
    {
      label: "Schools",
      title: "Hair for Youth in Schools",
      audience: "School-based programme",
      description: "Practical learning with age-appropriate conversations about wellbeing, confidence and healthy choices.",
      focus: ["Healthy choices", "Confidence", "Creative skills"],
      tone: "purple"
    },
    {
      label: "Justice",
      title: "Justice and Prevention",
      audience: "Young people",
      description: "Respectful engagement that combines practical hair skills with wellbeing and future-focused support.",
      focus: ["Trust and engagement", "Life skills", "New possibilities"],
      tone: "blue"
    }
  ],
  partners: [
    { title: "Schools and colleges", text: "Practical, confidence-building enrichment for young people." },
    { title: "Councils and community groups", text: "Accessible programmes shaped around local needs and opportunity." },
    { title: "Funders and corporate partners", text: "A practical route to support skills, wellbeing, and enterprise." }
  ]
} as const;
