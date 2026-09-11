import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { Home } from "./pages/Home";
import {
  Areas,
  Researchers,
  Projects,
  Publications,
  ContentPage,
} from "./pages/ListPages";
import {
  ResearcherDetail,
  ProjectDetail,
  PublicationDetail,
} from "./pages/Details";
import { Assistant } from "./pages/Assistant";
import { AuthPage } from "./pages/Auth";
import { About, Contact, GlobalSearch } from "./pages/Static";
import { Admin } from "./pages/Admin";
import { ResearcherSpace } from "./pages/ResearcherSpace";
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="research-areas" element={<Areas />} />
        <Route path="researchers" element={<Researchers />} />
        <Route path="researchers/:slug" element={<ResearcherDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:slug" element={<ProjectDetail />} />
        <Route path="publications" element={<Publications />} />
        <Route path="publications/:slug" element={<PublicationDetail />} />
        <Route
          path="events"
          element={
            <ContentPage
              kind="events"
              title="Events"
              text="Scientific meetings, workshops, and conferences."
            />
          }
        />
        <Route
          path="news"
          element={
            <ContentPage
              kind="news"
              title="News"
              text="Research news and achievements from our teams."
            />
          }
        />
        <Route
          path="resources"
          element={
            <ContentPage
              kind="resources"
              title="Open resources"
              text="Documents, datasets, and software produced by the center."
            />
          }
        />
        <Route path="search" element={<GlobalSearch />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="register" element={<AuthPage register />} />
        <Route path="researcher" element={<ResearcherSpace />} />
      </Route>
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NavigateHome />} />
    </Routes>
  );
}
function NavigateHome() {
  location.href = "/";
  return null;
}
