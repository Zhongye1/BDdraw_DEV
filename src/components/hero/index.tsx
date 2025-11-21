import { Rocket, Globe2, Wrench, Zap } from 'lucide-react'
import { Button } from '../ui/button'

export const Hero = () => {
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-lime-300 to-lime-500">
      <section className="w-full py-32 md:py-48">
        <div className="container px-4 md:px-6">
          <div className="grid items-center gap-6">
            <div className="flex flex-col justify-center space-y-4 text-center">
              <div className="mb-24">
                <h1 className="mb-6 text-3xl font-bold tracking-tighter text-transparent text-white sm:text-5xl xl:text-6xl/none">
                  Building Apps with the best DX we love
                </h1>
                <Button className="font-semiboldn gap-3 py-6 text-lg" size={'lg'} asChild>
                  <a href="https://github.com/Quilljou/vite-react-ts-tailwind-starter">
                    <Zap />
                    Get Started
                  </a>
                </Button>
              </div>
              <div className="mx-auto w-full max-w-full space-y-4">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <div className="flex flex-col items-center space-y-2 rounded-lg p-4">
                    <div className="rounded-full bg-black p-4 text-white">
                      <Rocket size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Modern and efficient stack</h2>
                    <p className="text-white">Built with Vite, React, Tailwind CSS, Shadcnui, and more</p>
                  </div>
                  <div className="flex flex-col items-center space-y-2 rounded-lg p-4">
                    <div className="rounded-full bg-black p-4 text-white">
                      <Globe2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">i18n support out of the box</h2>
                    <p className="text-white">Ship your product with different languages natively</p>
                  </div>
                  <div className="flex flex-col items-center space-y-2 rounded-lg p-4">
                    <div className="rounded-full bg-black p-4 text-white">
                      <Wrench size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Lint all code at save</h2>
                    <p className="text-white">Built with ESLint, Prettier, Stylelint, and Commitlint</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
