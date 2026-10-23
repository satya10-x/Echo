import { BriefcaseBusiness, HeartHandshake, Scale, Zap } from 'lucide-react';
export const personas = [
  { id: 'executive', name: 'Executive C-Level', short: 'Executive', label: 'Make every word count.', description: 'Professional, concise, and structured. Focus on decisions and next steps.', icon: BriefcaseBusiness, color: 'purple' },
  { id: 'supportive', name: 'Supportive Peer Feedback', short: 'Supportive peer', label: 'A little empathy goes a long way.', description: 'Empathetic, constructive feedback that helps people move forward.', icon: HeartHandshake, color: 'peach' },
  { id: 'legal', name: 'Legal / Compliance', short: 'Legal / compliance', label: 'Clarity without ambiguity.', description: 'Precise and neutral. Careful with obligations and commitments.', icon: Scale, color: 'blue' },
  { id: 'genz', name: 'Gen-Z', short: 'Gen-Z', label: 'Less corporate. More you.', description: 'Energetic, casual, and natural. Keep it right for your audience.', icon: Zap, color: 'green' },
];
