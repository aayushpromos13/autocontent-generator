import type { ProjectStatus } from '@/types/database';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string; dot: string }> = {
  draft: { label: 'Draft', className: 'bg-ink-100 text-ink-600', dot: 'bg-ink-400' },
  script_generating: { label: 'Script', className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  script_ready: { label: 'Script Ready', className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  scenes_generating: { label: 'Scenes', className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  scenes_ready: { label: 'Scenes Ready', className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  voiceover_generating: { label: 'Voiceover', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  visuals_generating: { label: 'Visuals', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  subtitles_generating: { label: 'Subtitles', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  video_assembling: { label: 'Assembling', className: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  ready: { label: 'Ready', className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  scheduled: { label: 'Scheduled', className: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  published: { label: 'Published', className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const isProcessing = status.includes('_generating') || status === 'video_assembling';
  return (
    <span className={`badge ${config.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${isProcessing ? 'animate-pulse-soft' : ''}`} />
      {config.label}
    </span>
  );
}
