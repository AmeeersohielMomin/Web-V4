import { useState, ReactNode } from 'react';

interface DeviceFrameProps {
  children: ReactNode;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const viewModes: { id: ViewMode; label: string; width: string; icon: string }[] = [
  { id: 'desktop', label: 'Desktop', width: '100%', icon: '🖥️' },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: '📱' },
  { id: 'mobile', label: 'Mobile', width: '375px', icon: '📲' },
];

export default function DeviceFrame({ children }: DeviceFrameProps) {
  const [mode, setMode] = useState<ViewMode>('desktop');
  const activeMode = viewModes.find((v) => v.id === mode)!;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 border-b border-slate-200 bg-slate-50">
        {viewModes.map((v) => (
          <button
            key={v.id}
            onClick={() => setMode(v.id)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === v.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{v.icon}</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* Preview Frame */}
      <div className="flex-1 flex justify-center overflow-auto bg-slate-100 p-4">
        <div
          style={{
            width: activeMode.width,
            maxWidth: '100%',
            transition: 'width 0.3s ease'
          }}
          className="bg-white shadow-lg rounded-lg overflow-hidden h-full"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
