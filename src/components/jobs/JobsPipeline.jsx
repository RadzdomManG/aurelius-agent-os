import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MapPin, ExternalLink } from 'lucide-react';

const COLUMNS = [
  { key: 'saved', label: 'Saved' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'apply', label: 'To Apply' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'ignore', label: 'Ignore' },
];

function formatPosted(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true });
}

function scoreTone(s) {
  if (s >= 70) return 'bg-amber-100 text-amber-700';
  if (s >= 40) return 'bg-stone-100 text-stone-600';
  return 'bg-stone-50 text-stone-400';
}

export default function JobsPipeline({ jobs, onMove, onOpen, readOnly }) {
  const byStatus = (status) => jobs.filter((j) => (j.status || 'saved') === status);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    if (sourceCol === destCol) return;
    const job = byStatus(sourceCol)[result.source.index];
    if (job) onMove(job.id, destCol);
  };

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 min-w-max">
          {COLUMNS.map((col) => {
            const items = byStatus(col.key);
            return (
              <div key={col.key} className="w-64 shrink-0">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[11.5px] font-semibold text-stone-500 uppercase tracking-wider">{col.label}</span>
                  <span className="text-[11px] text-stone-400 tabular-nums">{items.length}</span>
                </div>
                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[120px] rounded-xl p-1.5 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? 'bg-amber-50/60' : 'bg-stone-50/60'}`}
                    >
                      {items.map((job, idx) => (
                        <Draggable key={job.id} draggableId={job.id} index={idx}>
                          {(p, s) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...(readOnly ? {} : p.dragHandleProps)}
                              onClick={() => onOpen(job)}
                              className={`bg-white rounded-lg border p-2.5 cursor-pointer hover:border-amber-300 transition-colors ${s.isDragging ? 'shadow-lg border-amber-300' : 'border-stone-200'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[12.5px] font-semibold text-stone-800 truncate">{String(job.title || '').replace(/^\[(onlinejobsph|olj)\]\s*/i, '')}</div>
                                  <div className="text-[10px] text-stone-400 tabular-nums">{formatPosted(job.posted_at || job.created_date)}</div>
                                </div>
                                <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${scoreTone(job.match_score)} shrink-0 tabular-nums`}>{job.match_score || 0}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] text-stone-400">Posted</span>
                                {job.url && <a href={job.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ml-auto text-stone-300 hover:text-amber-600" title="Open original job post"><ExternalLink className="w-3 h-3" /></a>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && !provided.placeholder.props.children && (
                        <div className="text-[11px] text-stone-300 text-center py-4">Empty</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}