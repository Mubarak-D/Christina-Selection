// Authored line icons, one stroke weight (1.6) to match the type.
const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const ChevronLeft = () => <Svg d="M15 5l-7 7 7 7" size={16} />;
export const ChevronRight = () => <Svg d="M9 5l7 7-7 7" size={16} />;
export const Sparkle = () => <Svg d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />;
export const Clock = () => <Svg d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const Calendar = () => <Svg d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />;
export const Chat = () => <Svg d="M21 12a8 8 0 01-11.6 7.1L4 20l.9-4.9A8 8 0 1121 12z" size={14} />;
export const Mail = () => <Svg d="M4 6h16v12H4zM4 7l8 6 8-6" size={14} />;
