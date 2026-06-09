import HeroIsolationTestSection from "@/components/ui/hero-isolation-test-section";
import HomeBelowFoldSections from "@/components/ui/home-below-fold-sections";
import VideoHeroSection from "@/components/ui/video-hero-section";

export default function Home() {
  return (
    <>
      <VideoHeroSection />
      <HeroIsolationTestSection mode="home" />
      <HomeBelowFoldSections />
    </>
  );
}
