import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function OrderAssignBoard({ columns = [], onDragEnd = () => {} }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="panel rounded-xl shadow-sm p-4 min-h-[240px]">
                <div className="font-semibold mb-2">{col.title}</div>
                {col.items.map((item, index) => (
                  <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="p-3 mb-2 bg-slate-50 rounded-lg border">
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.customer}</div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
