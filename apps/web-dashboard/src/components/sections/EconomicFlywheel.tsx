'use client';

import { UsersIcon, ChartIcon, BrainIcon, RefreshIcon, TokenIcon } from '@/components/icons';

const flywheelSteps = [
  { icon: <UsersIcon size={24} />, label: 'Users', color: 'bg-ton-blue' },
  { icon: <ChartIcon size={24} />, label: 'Data', color: 'bg-accent-purple' },
  { icon: <BrainIcon size={24} />, label: 'AI', color: 'bg-vibrant-cyan' },
  { icon: <TokenIcon size={24} />, label: 'Yields', color: 'bg-success' },
  { icon: <RefreshIcon size={24} />, label: 'Liquidity', color: 'bg-warning' },
];

export function EconomicFlywheel() {
  return (
    <section className="py-20 md:py-32 bg-deep-navy text-white overflow-hidden">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              The TON AI Agent Economic Flywheel
            </h2>
            <p className="text-lg text-white/70 mb-8">
              A self-reinforcing economic loop that creates compounding value
              for all participants in the ecosystem.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-ton-blue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-ton-blue font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">More Users</h4>
                  <p className="text-white/60 text-sm">
                    Growing user base creates network effects and increases platform utility.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-purple font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Better Data</h4>
                  <p className="text-white/60 text-sm">
                    More transactions generate richer data for AI training and optimization.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-vibrant-cyan/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-vibrant-cyan font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Smarter AI</h4>
                  <p className="text-white/60 text-sm">
                    Enhanced models deliver better predictions and strategy optimization.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-success font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Higher Yields</h4>
                  <p className="text-white/60 text-sm">
                    Superior performance attracts capital and increases TVL.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-warning font-bold">5</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">More Liquidity</h4>
                  <p className="text-white/60 text-sm">
                    Deeper liquidity enables larger positions and attracts more users.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative flex items-center justify-center">
            {/* Flywheel Diagram */}
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              {/* Central Circle */}
              <div className="absolute inset-1/4 rounded-full bg-gradient-to-br from-ton-blue/30 to-vibrant-cyan/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold">TONAI</div>
                  <div className="text-sm text-white/60">Flywheel</div>
                </div>
              </div>

              {/* Rotating Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 animate-spin" style={{ animationDuration: '30s' }} />

              {/* Flywheel Steps */}
              {flywheelSteps.map((step, index) => {
                const angle = (index * 360) / flywheelSteps.length - 90;
                const radius = 140;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                return (
                  <div
                    key={step.label}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    }}
                  >
                    <div className={`${step.color} w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      {step.icon}
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap">
                      {step.label}
                    </div>
                  </div>
                );
              })}

              {/* Connection Arrows */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
                  </marker>
                </defs>
                <circle
                  cx="200"
                  cy="200"
                  r="140"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                  strokeDasharray="10 5"
                  fill="none"
                />
              </svg>
            </div>

            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-ton-blue/20 via-transparent to-vibrant-cyan/20 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
