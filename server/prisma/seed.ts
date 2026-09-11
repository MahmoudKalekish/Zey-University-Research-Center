import {
  PrismaClient,
  MessageStatus,
  ProjectStatus,
  PublicationType,
  ResourceType,
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
  const researcherPasswordHash = await bcrypt.hash("Research123!", 12);
  const additionalUsers = await Promise.all(
    [
      ["leila.nassar@zurc-demo.edu", "Leila", "Nassar", Role.RESEARCHER, true],
      ["youssef.amari@zurc-demo.edu", "Youssef", "Amari", Role.RESEARCHER, true],
      ["sarah.khoury@zurc-demo.edu", "Sarah", "Khoury", Role.RESEARCHER, true],
      ["visitor@zurc-demo.edu", "Rana", "Salem", Role.VISITOR, true],
      ["student@zurc-demo.edu", "Elias", "Nader", Role.VISITOR, true],
      ["inactive@zurc-demo.edu", "Demo", "Inactive", Role.VISITOR, false],
    ].map(([email, firstName, lastName, role, active]) =>
      p.user.create({
        data: {
          email: email as string,
          firstName: firstName as string,
          lastName: lastName as string,
          role: role as Role,
          active: active as boolean,
          passwordHash: researcherPasswordHash,
        },
      }),
    ),
  );
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
    [
      "Robotics and Autonomous Systems",
      "Create safe robots and autonomous systems for industry, agriculture, and public services.",
      "Bot",
      ["Human-robot collaboration", "Autonomous navigation", "Embedded intelligence"],
    ],
    [
      "Climate and Environmental Science",
      "Measure environmental change and design evidence-based adaptation strategies.",
      "CloudSun",
      ["Climate resilience", "Environmental monitoring", "Sustainable development"],
    ],
    [
      "Data Science and Analytics",
      "Turn complex institutional and scientific data into reproducible insight.",
      "ChartNoAxesCombined",
      ["Scientific data management", "Predictive analytics", "Open data"],
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
    [
      "Dr. Daniel Ibrahim",
      "Assistant Professor of Robotics",
      "He develops autonomous navigation and human-aware planning for mobile robots.",
      "daniel.ibrahim@zurc-demo.edu",
      "Zey University — Robotics Laboratory",
      ["robotics", "autonomous navigation", "human-robot interaction"],
      [0, 5],
    ],
    [
      "Dr. Rima Daher",
      "Environmental Data Scientist",
      "She combines satellite observations and field data to study climate resilience.",
      "rima.daher@zurc-demo.edu",
      "Zey University — Center for Environmental Studies",
      ["climate adaptation", "remote sensing", "environmental data"],
      [6, 7],
    ],
    [
      "Prof. Tarek Hamdan",
      "Professor of Data Science",
      "His research addresses scalable analytics, reproducibility, and scientific data governance.",
      "tarek.hamdan@zurc-demo.edu",
      "Zey University — School of Computing",
      ["data science", "open science", "knowledge graphs"],
      [0, 7],
    ],
    [
      "Dr. Nour El Din",
      "Research Fellow in Energy Systems",
      "She studies demand response and optimization for renewable-energy communities.",
      "nour.eldin@zurc-demo.edu",
      "Zey University — Energy Innovation Unit",
      ["renewable energy", "demand response", "optimization"],
      [4, 7],
    ],
    [
      "Jad Rahal",
      "Doctoral Researcher",
      "He investigates secure control and anomaly detection for autonomous platforms.",
      "jad.rahal@zurc-demo.edu",
      "Zey University — Doctoral School",
      ["robot security", "anomaly detection", "control systems"],
      [1, 5],
    ],
    [
      "Lina Azar",
      "Doctoral Researcher",
      "She develops urban heat and air-quality models for climate-aware city planning.",
      "lina.azar@zurc-demo.edu",
      "Zey University — Doctoral School",
      ["urban climate", "air quality", "geospatial analytics"],
      [2, 6, 7],
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
          orcid: `0000-0002-${String(1000 + i)}-${String(7000 + i)}`,
          userId:
            i === 0
              ? researcherUser.id
              : i >= 1 && i <= 3
                ? additionalUsers[i - 1]!.id
                : undefined,
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
    [
      "AgriBot",
      "Autonomous robots for precise and sustainable agriculture.",
      "AgriBot combines computer vision, safe navigation, and field robotics to reduce water and pesticide use.",
      ProjectStatus.ACTIVE,
      [0, 5],
      [6, 10],
    ],
    [
      "ClimateWatch Lebanon",
      "An open observatory for local climate and environmental indicators.",
      "The project integrates satellite, sensor, and community observations into reproducible climate-risk indicators.",
      ProjectStatus.ACTIVE,
      [6, 7],
      [7, 8, 11],
    ],
    [
      "OpenResearch Graph",
      "A knowledge graph connecting the university's researchers, projects, and scholarly outputs.",
      "The platform studies entity resolution, metadata quality, and explainable recommendations for open-science discovery.",
      ProjectStatus.PLANNED,
      [0, 7],
      [8, 5],
    ],
    [
      "GridFlex",
      "Demand-response optimization for renewable-energy communities.",
      "GridFlex develops forecasting and optimization tools that coordinate flexible loads with local renewable production.",
      ProjectStatus.ACTIVE,
      [4, 7],
      [4, 9],
    ],
    [
      "Secure Autonomy Lab",
      "Resilient control and cyber protection for autonomous systems.",
      "This project evaluates attacks against robotic perception and control and develops explainable anomaly detection.",
      ProjectStatus.SUSPENDED,
      [1, 5],
      [1, 6, 10],
    ],
    [
      "CoastResilience",
      "Climate-informed planning tools for resilient coastal communities.",
      "CoastResilience combines geospatial data, urban models, and participatory scenarios for adaptation planning.",
      ProjectStatus.PLANNED,
      [2, 6],
      [7, 11],
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
    [
      "Vision-Based Navigation in Unstructured Agricultural Fields",
      "A robust perception and navigation pipeline for agricultural robots operating under changing illumination.",
      "IEEE Robotics and Automation Letters",
      ["robotics", "computer vision", "agriculture"],
      4,
      [0, 5],
      [6, 10],
    ],
    [
      "A Benchmark for Human-Aware Mobile Robot Planning",
      "An open benchmark for measuring safety, efficiency, and social compliance in robot navigation.",
      "International Conference on Robotics and Automation",
      ["robotics", "planning", "human-robot interaction"],
      4,
      [5],
      [6],
    ],
    [
      "Satellite-Based Drought Indicators for the Eastern Mediterranean",
      "A reproducible comparison of remote-sensing indicators for seasonal drought monitoring.",
      "Remote Sensing of Environment",
      ["climate", "drought", "remote sensing"],
      5,
      [6, 7],
      [7, 11],
    ],
    [
      "Community Air-Quality Sensing in Dense Urban Districts",
      "A calibration and deployment study of low-cost air-quality sensors in urban neighborhoods.",
      "Environmental Monitoring and Assessment",
      ["air quality", "sensors", "smart cities"],
      5,
      [2, 6],
      [11, 2],
    ],
    [
      "Knowledge Graphs for Institutional Research Discovery",
      "A domain model and entity-resolution workflow for connecting researchers, outputs, projects, and themes.",
      "Open Science Conference",
      ["knowledge graphs", "open science", "research information"],
      6,
      [0, 7],
      [8, 5],
    ],
    [
      "Reproducible Pipelines for University Research Analytics",
      "A practical framework for transparent indicators derived from heterogeneous scholarly metadata.",
      "Journal of Informetrics",
      ["data science", "reproducibility", "research analytics"],
      6,
      [7],
      [8],
    ],
    [
      "Privacy-Aware Entity Resolution for Scholarly Records",
      "A privacy-aware method for identifying duplicate researchers and outputs in institutional databases.",
      "Data and Information Management",
      ["entity resolution", "privacy", "scholarly data"],
      6,
      [1, 7],
      [8, 1],
    ],
    [
      "Forecasting Flexible Demand in Renewable-Energy Communities",
      "Short-term probabilistic demand forecasts designed for community demand-response programs.",
      "Energy and AI",
      ["energy forecasting", "demand response", "machine learning"],
      7,
      [0, 4, 7],
      [9, 4],
    ],
    [
      "Multi-Objective Scheduling for Local Energy Flexibility",
      "An optimization model balancing cost, emissions, and participant comfort in local energy communities.",
      "Applied Energy Symposium",
      ["optimization", "smart grids", "sustainability"],
      7,
      [4, 7],
      [9, 4],
    ],
    [
      "Adversarial Sensor Attacks Against Autonomous Robots",
      "An experimental study of perception attacks and their effect on autonomous navigation safety.",
      "ACM Conference on Cyber-Physical Systems Security",
      ["robot security", "adversarial attacks", "autonomous systems"],
      8,
      [1, 5],
      [10, 6, 1],
    ],
    [
      "Explainable Anomaly Detection for Robotic Control",
      "A temporal anomaly detector that provides operator-facing explanations for abnormal robot behavior.",
      "Robotics and Autonomous Systems",
      ["anomaly detection", "explainable AI", "robotics"],
      8,
      [0, 1, 5],
      [10, 6],
    ],
    [
      "Geospatial Scenarios for Coastal Climate Adaptation",
      "A participatory scenario framework linking coastal hazards with infrastructure and population exposure.",
      "Climate Risk Management",
      ["coastal resilience", "GIS", "climate adaptation"],
      9,
      [2, 6],
      [7, 11],
    ],
    [
      "Urban Heat Mapping with Open Satellite Data",
      "A city-scale dataset and workflow for mapping heat exposure from open earth-observation data.",
      "Earth System Science Data",
      ["urban heat", "open data", "remote sensing"],
      9,
      [2, 6, 7],
      [11, 7],
    ],
    [
      "Federated Learning for Distributed Clinical Imaging",
      "A study of privacy-preserving model training across hospitals with heterogeneous imaging protocols.",
      "Medical Image Computing and Computer Assisted Intervention",
      ["federated learning", "medical imaging", "privacy"],
      1,
      [0, 1, 3],
      [3, 0, 1],
    ],
    [
      "Responsible Language Technologies for Public Institutions",
      "A governance framework for evaluating bias, transparency, and human oversight in public-sector language systems.",
      "AI and Society",
      ["responsible AI", "NLP", "governance"],
      6,
      [0, 7],
      [5, 8],
    ],
    [
      "A Dataset of Urban Mobility and Environmental Observations",
      "A documented multimodal dataset aligning mobility flows, weather, noise, and air-quality measurements.",
      "Scientific Data",
      ["dataset", "urban mobility", "environment"],
      0,
      [2, 6, 7],
      [2, 7, 11],
    ],
    [
      "Secure Authentication Protocols for Resource-Constrained Sensors",
      "A comparative analysis and lightweight protocol for constrained urban and industrial sensors.",
      "IEEE Internet of Things Journal",
      ["authentication", "IoT", "cybersecurity"],
      2,
      [1, 2],
      [1, 10],
    ],
    [
      "Doctoral Thesis: Transparent Machine Learning for Critical Decisions",
      "A thesis unifying explanation quality, uncertainty, and fairness for high-stakes machine-learning systems.",
      "Zey University Doctoral School",
      ["thesis", "explainable AI", "fairness"],
      1,
      [0, 3],
      [5, 0],
    ],
  ];
  const publicationTypes = [
    PublicationType.JOURNAL_ARTICLE,
    PublicationType.CONFERENCE_PAPER,
    PublicationType.BOOK_CHAPTER,
    PublicationType.REPORT,
    PublicationType.DATASET,
    PublicationType.JOURNAL_ARTICLE,
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
          title.startsWith("Doctoral Thesis")
            ? PublicationType.THESIS
            : publicationTypes[i % publicationTypes.length]!,
        publicationDate: new Date(2021 + (i % 6), 11 - (i % 8), 12),
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
      {
        title: "Open Research Data Bootcamp",
        slug: slug("Open Research Data Bootcamp"),
        description:
          "Two days of practical sessions on data management plans, metadata, licensing, and reproducible workflows.",
        startDate: new Date(future.getTime() + 86400000 * 48),
        endDate: new Date(future.getTime() + 86400000 * 49),
        location: "Digital Scholarship Lab",
        registrationUrl: "https://example.org/events/open-data-bootcamp",
      },
      {
        title: "Robotics Research Open Day",
        slug: slug("Robotics Research Open Day"),
        description:
          "Live demonstrations from AgriBot and the Secure Autonomy Laboratory.",
        startDate: new Date(future.getTime() + 86400000 * 62),
        location: "Engineering Innovation Hall",
      },
      {
        title: "Climate Adaptation Policy Forum",
        slug: slug("Climate Adaptation Policy Forum"),
        description:
          "Researchers, municipalities, and civil society discuss evidence-based local adaptation priorities.",
        startDate: new Date(future.getTime() + 86400000 * 78),
        location: "Conference Center",
        registrationUrl: "https://example.org/events/climate-forum",
      },
      {
        title: "Graduate Research Methods Clinic",
        slug: slug("Graduate Research Methods Clinic"),
        description:
          "Small-group consultations on study design, research ethics, statistics, and scientific communication.",
        startDate: new Date(future.getTime() + 86400000 * 91),
        location: "Research Commons",
      },
      {
        title: "Data Science Colloquium",
        slug: slug("Data Science Colloquium"),
        description:
          "A monthly lecture series on trustworthy analytics and open scientific infrastructure.",
        startDate: new Date(future.getTime() + 86400000 * 110),
        location: "Online and Room B204",
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
      {
        title: "AgriBot Completes Its First Field Trials",
        slug: slug("AgriBot Completes Its First Field Trials"),
        excerpt:
          "The autonomous agriculture team successfully tested navigation and crop monitoring in realistic field conditions.",
        content:
          "The trials evaluated navigation accuracy, perception under changing light, and safe collaboration with field workers. The collected data will support the project's next evaluation phase.",
        published: true,
        publishedAt: new Date(Date.now() - 86400000 * 28),
      },
      {
        title: "ZURC Launches an Open Climate Data Observatory",
        slug: slug("ZURC Launches an Open Climate Data Observatory"),
        excerpt:
          "ClimateWatch Lebanon now provides documented environmental indicators for researchers and public partners.",
        content:
          "The observatory brings together satellite observations, sensors, and reusable analytical workflows. New datasets will be reviewed before publication.",
        published: true,
        publishedAt: new Date(Date.now() - 86400000 * 36),
      },
      {
        title: "New Seed Grants Support Interdisciplinary Research",
        slug: slug("New Seed Grants Support Interdisciplinary Research"),
        excerpt:
          "Four teams received internal support for projects crossing computing, health, energy, and environmental science.",
        content:
          "The grants encourage early validation, shared datasets, student training, and external partnership development.",
        published: true,
        publishedAt: new Date(Date.now() - 86400000 * 45),
      },
      {
        title: "Researchers Publish Urban Heat Dataset",
        slug: slug("Researchers Publish Urban Heat Dataset"),
        excerpt:
          "A new open dataset helps study neighborhood-scale heat exposure using satellite and field measurements.",
        content:
          "The release includes metadata, processing scripts, quality notes, and examples intended to support reproducible use.",
        published: true,
        publishedAt: new Date(Date.now() - 86400000 * 56),
      },
      {
        title: "Draft Research Integrity Guidelines Open for Review",
        slug: slug("Draft Research Integrity Guidelines Open for Review"),
        excerpt:
          "Center members are invited to comment on proposed guidance for data, authorship, and responsible AI.",
        content:
          "This draft item demonstrates that unpublished news remains available to administrators but is excluded from the public website.",
        published: false,
        publishedAt: null,
      },
    ],
  });
  await p.resource.createMany({
    data: [
      {
        title: "Open Science Charter",
        description:
          "Principles for research dissemination and data management.",
        type: ResourceType.DOCUMENT,
        url: "https://example.org/charte",
      },
      {
        title: "CitySense Data Repository",
        description: "Anonymized urban research datasets.",
        type: ResourceType.DATASET,
        url: "https://example.org/data",
      },
      {
        title: "MedExplain Source Code",
        description: "Reproducible tools developed by the project.",
        type: ResourceType.SOFTWARE,
        url: "https://github.com/example/medexplain",
      },
      {
        title: "Publication Metadata Template",
        description:
          "A reusable spreadsheet and field guide for preparing publication records before import.",
        type: ResourceType.DOCUMENT,
        url: "https://example.org/resources/publication-template",
      },
      {
        title: "Urban Heat Observation Dataset",
        description:
          "Documented satellite-derived and field-observed urban heat measurements for teaching and research.",
        type: ResourceType.DATASET,
        url: "https://example.org/data/urban-heat",
      },
      {
        title: "Research Analytics Toolkit",
        description:
          "Open scripts for validating scholarly metadata and producing reproducible research indicators.",
        type: ResourceType.SOFTWARE,
        url: "https://github.com/example/research-analytics-toolkit",
      },
      {
        title: "Research Ethics Guidance",
        description:
          "University guidance for responsible data collection, consent, authorship, and research integrity.",
        type: ResourceType.LINK,
        url: "https://example.org/research-ethics",
      },
      {
        title: "Internal Project Review Checklist",
        description:
          "An unpublished checklist used to demonstrate administrative visibility controls.",
        type: ResourceType.DOCUMENT,
        url: "https://example.org/internal/project-review",
        published: false,
      },
    ],
  });
  await p.contactMessage.createMany({
    data: [
      {
        name: "Amal Saadeh",
        email: "amal.saadeh@example.com",
        subject: "Master's supervision in artificial intelligence",
        message:
          "I am interested in explainable machine learning and would like to know which researchers are accepting Master's students next semester.",
        status: MessageStatus.NEW,
      },
      {
        name: "Georges Habib",
        email: "georges.habib@example.com",
        subject: "Smart-city research partnership",
        message:
          "Our municipality would like to discuss a possible pilot project involving mobility data and urban environmental sensing.",
        status: MessageStatus.READ,
      },
      {
        name: "Mira Khalil",
        email: "mira.khalil@example.com",
        subject: "Request to access urban heat dataset",
        message:
          "Could you clarify the license and citation requirements for the Urban Heat Observation Dataset?",
        status: MessageStatus.REPLIED,
      },
      {
        name: "Sami Daher",
        email: "sami.daher@example.com",
        subject: "Invitation to cybersecurity panel",
        message:
          "We invite a ZURC cybersecurity researcher to participate in our upcoming higher-education security panel.",
        status: MessageStatus.NEW,
      },
      {
        name: "Hala Mansour",
        email: "hala.mansour@example.com",
        subject: "Completed resource-link correction",
        message:
          "The corrected link is now working. Thank you for updating the resource catalogue.",
        status: MessageStatus.ARCHIVED,
      },
    ],
  });
  const [
    userCount,
    researcherCount,
    areaCount,
    projectCount,
    publicationCount,
    eventCount,
    newsCount,
    resourceCount,
    messageCount,
  ] = await p.$transaction([
    p.user.count(),
    p.researcher.count(),
    p.researchArea.count(),
    p.project.count(),
    p.publication.count(),
    p.event.count(),
    p.news.count(),
    p.resource.count(),
    p.contactMessage.count(),
  ]);
  console.log(
    `Seed completed: ${userCount} users, ${researcherCount} researchers, ${areaCount} areas, ${projectCount} projects, ${publicationCount} publications, ${eventCount} events, ${newsCount} news items, ${resourceCount} resources, and ${messageCount} contact messages.`,
  );
  console.log(`Admin: ${admin.email} / Admin123!`);
  console.log(`Researcher: ${researcherUser.email} / Research123!`);
  console.log("Visitor: visitor@zurc-demo.edu / Research123!");
}
main().finally(() => p.$disconnect());
