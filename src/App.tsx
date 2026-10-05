import { lazy, Suspense } from "react"
import { Experience } from "@/experience/Experience"
import { Nav } from "@/components/site/Nav"
import { Hero } from "@/components/site/scenes/Hero"
import { Story } from "@/components/site/scenes/Story"
import { Shape } from "@/components/site/scenes/Shape"
import { Stack } from "@/components/site/scenes/Stack"
import { Ingredients } from "@/components/site/scenes/Ingredients"
import { Flavors } from "@/components/site/scenes/Flavors"
import { History } from "@/components/site/scenes/History"
import { Play } from "@/components/site/scenes/Play"
import { Community } from "@/components/site/scenes/Community"
import { Finale, Footer } from "@/components/site/scenes/Finale"

// The integrated reference component, on its own page: /#disc-demo
const DiscDemo = lazy(() => import("@/components/demo/disc-cascade-demo"))

export default function App() {
  if (typeof location !== "undefined" && location.hash === "#disc-demo") {
    return (
      <Suspense fallback={null}>
        <DiscDemo />
      </Suspense>
    )
  }
  return (
    <>
      <Experience />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Story />
        <Shape />
        <Stack />
        <Ingredients />
        <Flavors />
        <History />
        <Play />
        <Community />
        <Finale />
      </main>
      <Footer />
    </>
  )
}
