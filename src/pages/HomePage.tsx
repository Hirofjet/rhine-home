import {
  AbilitiesSection,
  ContactSection,
  DossierSection,
  HeroSection,
  ProjectsSection,
} from '../components/home'

export function HomePage() {
  return (
    <main>
      <HeroSection />
      <DossierSection />
      <AbilitiesSection />
      <ProjectsSection />
      <ContactSection />
    </main>
  )
}
