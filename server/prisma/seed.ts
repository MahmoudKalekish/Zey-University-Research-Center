import {
  PrismaClient,
  ProjectStatus,
  PublicationType,
  Role,
  type ResearchArea,
  type Researcher,
  type Project,
} from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
async function main() {
  await p.aiMessage.deleteMany();
  await p.aiConversation.deleteMany();
  await p.publicationAuthor.deleteMany();
  await p.publicationArea.deleteMany();
  await p.projectResearcher.deleteMany();
  await p.projectArea.deleteMany();
  await p.publication.deleteMany();
  await p.project.deleteMany();
  await p.researcherArea.deleteMany();
  await p.researcher.deleteMany();
  await p.researchArea.deleteMany();
  await p.event.deleteMany();
  await p.news.deleteMany();
  await p.resource.deleteMany();
  await p.contactMessage.deleteMany();
  await p.user.deleteMany();
  const passwordHash = await bcrypt.hash("Admin123!", 12);
  const admin = await p.user.create({
    data: {
      email: "admin@zurc-demo.edu",
      firstName: "Nadia",
      lastName: "Mansour",
      role: Role.ADMIN,
      passwordHash,
    },
  });
  const researcherUser = await p.user.create({
    data: {
      email: "researcher@zurc-demo.edu",
      firstName: "Karim",
      lastName: "Haddad",
      role: Role.RESEARCHER,
      passwordHash: await bcrypt.hash("Research123!", 12),
    },
  });
  const areaData = [
    [
      "Artificial Intelligence",
      "Develop intelligent, explainable, and responsible systems that serve society.",
      "BrainCircuit",
      ["Trustworthy learning", "Responsible AI", "Natural language processing"],
    ],
    [
      "Cybersecurity",
      "Protect critical infrastructure, data, and digital services.",
      "ShieldCheck",
      ["Threat detection", "Applied cryptography", "Resilience"],
    ],
    [
      "Smart Cities",
      "Design connected, sustainable, and citizen-centered communities.",
      "Building2",
      ["Sustainable mobility", "Urban IoT", "Decision support"],
    ],
    [
      "Digital Health",
      "Transform prevention, diagnosis, and care pathways through digital technology.",
      "HeartPulse",
      ["Medical imaging", "Personalized medicine", "Interoperability"],
    ],
    [
      "Sustainable Energy",
      "Optimize renewable energy production and consumption.",
      "Leaf",
      ["Smart grids", "Energy forecasting", "Digital sustainability"],
    ],
  ];
  const areas: ResearchArea[] = [];
  for (const [name, description, icon, objectives] of areaData)
    areas.push(
      await p.researchArea.create({
        data: {
          name: name as string,
          slug: slug(name as string),
          description: description as string,
          icon: icon as string,
          objectives: objectives as string[],
        },
      }),
    );
  const people = [
    [
      "Prof. Karim Haddad",
      "Professor of Computer Science",
      "Specialist in explainable machine learning and its applications to critical systems.",
      "karim.haddad@zurc-demo.edu",
      "Zey University — Department of Computer Science",
      ["machine learning", "explainable AI", "deep learning"],
      [0, 3],
    ],
    [
      "Dr. Leila Nassar",
      "Associate Professor",
      "Her research focuses on network security, privacy protection, and cryptography.",
      "leila.nassar@zurc-demo.edu",
      "Zey University — Systems Laboratory",
      ["cybersecurity", "cryptography", "privacy"],
      [1],
    ],
    [
      "Dr. Youssef Amari",
      "Senior Researcher",
      "He studies digital twins, urban sensors, and intelligent mobility.",
      "youssef.amari@zurc-demo.edu",
      "Zey University — Institute for Urban Studies",
      ["smart cities", "IoT", "digital twins"],
      [2, 4],
    ],
    [
      "Dr. Sarah Khoury",
      "Postdoctoral Researcher",
      "She develops robust and interpretable models for computer-assisted medical diagnosis.",
      "sarah.khoury@zurc-demo.edu",
      "Zey University — Faculty of Health Sciences",
      ["medical imaging", "AI", "diagnostic"],
      [0, 3],
    ],
    [
      "Prof. Omar Saad",
      "Professor of Electrical Engineering",
      "His work focuses on microgrids and solar generation forecasting.",
      "omar.saad@zurc-demo.edu",
      "Zey University — School of Engineering",
      ["smart grids", "solar energy", "forecasting"],
      [4],
    ],
    [
      "Maya Farah",
      "Doctoral Researcher",
      "She studies algorithmic fairness in public service platforms.",
      "maya.farah@zurc-demo.edu",
      "Zey University — Doctoral School",
      ["fairness", "NLP", "public services"],
      [0, 2],
    ],
  ];
  const researchers: Researcher[] = [];
  for (let i = 0; i < people.length; i++) {
    const [name, position, biography, email, affiliation, interests, aids] =
      people[i] as any;
    researchers.push(
      await p.researcher.create({
        data: {
          name,
          slug: slug(name),
          position,
          biography,
          email,
          affiliation,
          interests,
          orcid: `0000-000${i + 1}-2345-678${i}`,
          userId: i === 0 ? researcherUser.id : undefined,
          areas: {
            create: aids.map((x: number) => ({ areaId: areas[x]!.id })),
          },
        },
      }),
    );
  }
  const projectData = [
    [
      "CitySense",
      "A digital twin platform for sustainable urban mobility.",
      "CitySense combines mobility flows and environmental sensors to simulate urban policies before deployment.",
      ProjectStatus.ACTIVE,
      [2, 4],
      [2, 5],
    ],
    [
      "MedExplain",
      "Explainable AI for radiology decision support.",
      "The project designs and evaluates multimodal models that explain their predictions to clinicians.",
      ProjectStatus.ACTIVE,
      [0, 3],
      [0, 3],
    ],
    [
      "CyberCampus",
      "Cyber resilience for university infrastructure.",
      "CyberCampus builds a testbed and privacy-preserving collaborative detection methods.",
      ProjectStatus.ACTIVE,
      [1],
      [1],
    ],
    [
      "SolarCast",
      "Probabilistic forecasting of photovoltaic generation.",
      "SolarCast combines weather data and deep learning to manage microgrids.",
      ProjectStatus.COMPLETED,
      [0, 4],
      [0, 4],
    ],
  ];
  const projects: Project[] = [];
  for (let i = 0; i < projectData.length; i++) {
    const [title, description, abstract, status, aids, rids] = projectData[
      i
    ] as any;
    projects.push(
      await p.project.create({
        data: {
          title,
          slug: slug(title),
          description,
          abstract,
          status,
          startDate: new Date(2023 + (i % 2), 2, 1),
          endDate: status === "COMPLETED" ? new Date(2025, 5, 30) : null,
          funding:
            i === 0
              ? "National Research Program — $300,000"
              : "Zey University and partners",
          featured: i < 3,
          objectives: [
            "Produce open research knowledge",
            "Train early-career researchers",
            "Transfer research outcomes",
          ],
          areas: {
            create: aids.map((x: number) => ({ areaId: areas[x]!.id })),
          },
          researchers: {
            create: rids.map((x: number) => ({
              researcherId: researchers[x]!.id,
              role: x === rids[0] ? "Principal Investigator" : "Member",
            })),
          },
        },
      }),
    );
  }
  const topics = [
    [
      "Explainable Learning for Multimodal Diagnosis",
      "A counterfactual explanation method designed for multimodal medical data.",
      "Journal of Responsible AI",
      ["explainable AI", "health", "diagnosis"],
      0,
      [0, 3],
      [0, 3],
    ],
    [
      "A Privacy-Preserving Intrusion Detection Framework",
      "A federated intrusion detection framework that protects privacy across connected campuses.",
      "IEEE Security & Privacy",
      ["cybersecurity", "federated learning"],
      2,
      [1],
      [1],
    ],
    [
      "Digital Twins for Sustainable Urban Mobility",
      "A digital twin architecture for evaluating urban mobility scenarios.",
      "Smart Cities Conference",
      ["smart cities", "digital twins", "mobility"],
      0,
      [2],
      [2, 5],
    ],
    [
      "Probabilistic Solar Forecasting with Deep Ensembles",
      "A robust probabilistic forecasting study applied to solar microgrids.",
      "Renewable Energy Systems",
      ["solar energy", "deep learning"],
      3,
      [0, 4],
      [0, 4],
    ],
    [
      "Fairness Auditing in Digital Public Services",
      "A protocol for auditing the fairness of decision algorithms in public services.",
      "ACM FAccT",
      ["fairness", "public services"],
      0,
      [0, 2],
      [5],
    ],
    [
      "Secure IoT Sensing for Smart Campuses",
      "A lightweight sensor authentication solution for smart campuses.",
      "IoT Systems Journal",
      ["IoT", "security"],
      2,
      [1, 2],
      [1, 2],
    ],
    [
      "Clinical Validation of Interpretable Vision Models",
      "A multicenter clinical validation of interpretable medical imaging models.",
      "Medical Image Analysis",
      ["medical imaging", "interpretability"],
      1,
      [0, 3],
      [0, 3],
    ],
    [
      "Energy-Aware Routing for Urban Sensor Networks",
      "Adaptive routing that reduces energy use in urban sensor networks.",
      "Sustainable Computing",
      ["smart cities", "energy", "IoT"],
      0,
      [2, 4],
      [2],
    ],
    [
      "Language Models for Low-Resource Academic Text",
      "Evaluation of local language models on low-resource scientific corpora.",
      "TALN",
      ["NLP", "language models"],
      0,
      [0],
      [0, 5],
    ],
    [
      "Cyber Resilience Maturity Model for Universities",
      "A maturity model and indicators for university cyber resilience.",
      "Computers & Security",
      ["cybersecurity", "resilience"],
      2,
      [1],
      [1],
    ],
    [
      "Open Urban Data Quality Assessment",
      "A reproducible framework for assessing the quality of open urban data.",
      "Data & Policy",
      ["open data", "smart cities"],
      0,
      [2],
      [2, 5],
    ],
    [
      "Optimization of Community Microgrids",
      "A multi-objective approach to optimizing community microgrids.",
      "Applied Energy",
      ["optimization", "microgrids"],
      3,
      [4],
      [4],
    ],
  ];
  for (let i = 0; i < topics.length; i++) {
    const [title, abstract, venue, keywords, pid, aids, rids] = topics[
      i
    ] as any;
    await p.publication.create({
      data: {
        title,
        slug: slug(title),
        abstract,
        venue,
        keywords,
        type:
          i % 3 === 0
            ? PublicationType.CONFERENCE_PAPER
            : PublicationType.JOURNAL_ARTICLE,
        publicationDate: new Date(2023 + (i % 3), 11 - (i % 8), 12),
        doi: `10.5555/cru.${2024 + i}.${100 + i}`,
        externalUrl: "https://doi.org/10.5555/demo",
        featured: i < 4,
        projectId: projects[pid]!.id,
        areas: { create: aids.map((x: number) => ({ areaId: areas[x]!.id })) },
        authors: {
          create: rids.map((x: number, j: number) => ({
            researcherId: researchers[x]!.id,
            authorOrder: j,
            corresponding: j === 0,
          })),
        },
      },
    });
  }
  const future = new Date();
  future.setMonth(future.getMonth() + 2);
  await p.event.createMany({
    data: [
      {
        title: "Research Showcase 2026",
        slug: "research-showcase-2026",
        description:
          "Project presentations and conversations with our research teams.",
        startDate: future,
        location: "Main Auditorium",
      },
      {
        title: "Responsible AI Workshop",
        slug: "responsible-ai-workshop",
        description: "A practical workshop on evaluating explainable models.",
        startDate: new Date(future.getTime() + 86400000 * 20),
        location: "Lab Innovation",
      },
      {
        title: "Cybersecurity Seminar",
        slug: "cybersecurity-seminar",
        description: "Building resilient research infrastructure.",
        startDate: new Date(future.getTime() + 86400000 * 35),
        location: "Online",
      },
    ],
  });
  await p.news.createMany({
    data: [
      {
        title: "MedExplain Receives National Research Funding",
        slug: "medexplain-national-funding",
        excerpt: "Major support for trustworthy clinical AI research.",
        content:
          "The consortium will continue its work over the next three years.",
        published: true,
        publishedAt: new Date(),
      },
      {
        title: "New Partnership for Sustainable Cities",
        slug: "sustainable-cities-partnership",
        excerpt: "An international partnership focused on digital twins.",
        content: "The teams will share data, tools, and training programs.",
        published: true,
        publishedAt: new Date(Date.now() - 86400000 * 10),
      },
      {
        title: "Three Doctoral Researchers Receive Awards",
        slug: "doctoral-researcher-awards",
        excerpt: "Their work was recognized at the annual doctoral forum.",
        content: "The center congratulates this year's award recipients.",
        published: true,
        publishedAt: new Date(Date.now() - 86400000 * 20),
      },
    ],
  });
  await p.resource.createMany({
    data: [
      {
        title: "Open Science Charter",
        description:
          "Principles for research dissemination and data management.",
        type: "DOCUMENT",
        url: "https://example.org/charte",
      },
      {
        title: "CitySense Data Repository",
        description: "Anonymized urban research datasets.",
        type: "DATASET",
        url: "https://example.org/data",
      },
      {
        title: "MedExplain Source Code",
        description: "Reproducible tools developed by the project.",
        type: "SOFTWARE",
        url: "https://github.com/example/medexplain",
      },
    ],
  });
  console.log(`Seed completed. Admin: ${admin.email} / Admin123!`);
}
main().finally(() => p.$disconnect());
