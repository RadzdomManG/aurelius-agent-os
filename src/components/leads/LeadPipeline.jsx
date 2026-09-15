import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MapPin, Globe } from 'lucide-react';

const COLUMNS = [
  { key: 'new', label: 'New' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'replied', label: 'Replied' },
  { key: 'interested', label: 'Interested' },
  { key: 'follow_up', label: 'Follow Up' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'do_not_contact', label: 'Do Not Contact' },
];

function scoreTone(s) {
  if (s >= 80) return 'bg-amber-100 text-amber-700';
  if (s >= 50) return 'bg-stone-100 text-stone-600';
  return 'bg-stone-50 text-stone-400';
}

export default function LeadPipeline({ leads, onMove, onOpen }) {
  const byStatus = (status) => leads.filter((l) => (l.status || 'new') === status);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    if (sourceCol === destCol) return;
    const lead = byStatus(sourceCol)[result.source.index];
    if (lead) onMove(lead.id, destCol);
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
                      {items.map((lead, idx) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(p, s) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              onClick={() => onOpen(lead)}
                              className={`bg-white rounded-lg border p-2.5 cursor-pointer hover:border-amber-300 transition-colors ${s.isDragging ? 'shadow-lg border-amber-300' : 'border-stone-200'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[12.5px] font-semibold text-stone-800 truncate">{lead.name}</div>
                                  {lead.company && <div className="text-[11px] text-stone-500 truncate">{lead.company}</div>}
                                </div>
                                <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${scoreTone(lead.lead_score)} shrink-0 tabular-nums`}>{lead.lead_score || 0}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {lead.industry && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{lead.industry}</span>}
                                {lead.location && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400">
                                    <MapPin className="w-2.5 h-2.5" /> {lead.location}
                                  </span>
                                )}
                                {lead.website && <Globe className="w-3 h-3 text-stone-300 ml-auto" />}
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