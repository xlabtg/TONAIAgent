import { Metadata } from 'next';
import { DemoHero } from '@/components/demo/DemoHero';
import { DemoModes } from '@/components/demo/DemoModes';
import { AIGenerator } from '@/components/demo/AIGenerator';
import { AgentVisualization } from '@/components/demo/AgentVisualization';
import { LiveSimulation } from '@/components/demo/LiveSimulation';
import { DemoCTA } from '@/components/demo/DemoCTA';

export const metadata: Metadata = {
  title: 'Interactive Demo | TON AI Agent',
  description:
    'Experience AI-native autonomous finance on TON. Create agents, explore strategies, generate UI concepts, and visualize autonomous workflows — no signup required.',
  openGraph: {
    title: 'Interactive Demo | TON AI Agent',
    description: 'Experience AI-native autonomous finance on TON. Try it now — no signup required.',
    images: ['/og-demo.png'],
  },
};

export default function DemoPage() {
  return (
    <>
      <DemoHero />
      <DemoModes />
      <AIGenerator />
      <AgentVisualization />
      <LiveSimulation />
      <DemoCTA />
    </>
  );
}
