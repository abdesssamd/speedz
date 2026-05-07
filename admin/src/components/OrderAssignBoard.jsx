import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

/**
 * OrderAssignBoard — Kanban d'assignation de commandes
 *
 * Améliorations dark-mode + UX :
 * - Classes Tailwind dark: sur toutes les surfaces (plus de bg-slate-50 hardcodé)
 * - Highlight orange de la colonne drop cible via isDraggingOver
 * - État vide par colonne avec message contextuel
 * - Cartes enrichies : montant + restaurant + statut
 * - Indicateur de count dans le header de colonne
 */
export default function OrderAssignBoard({ columns = [], onDragEnd = () => {} }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="order-board-grid">
        {columns.map((col) => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`order-board-col ${snapshot.isDraggingOver ? 'is-over' : ''}`}
              >
                {/* Header colonne */}
                <div className="order-board-col-head">
                  <span className="order-board-col-title">{col.title}</span>
                  <span className="order-board-col-count">{col.items.length}</span>
                </div>

                {/* Items */}
                {col.items.map((item, index) => (
                  <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                    {(p, snap) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        className={`order-board-card ${snap.isDragging ? 'is-dragging' : ''}`}
                      >
                        <div className="order-board-card-head">
                          <span className="order-board-card-title">
                            {item.title || `#${item.id}`}
                          </span>
                          {item.total != null && (
                            <span className="order-board-card-amount">
                              {Math.round(item.total).toLocaleString('fr-DZ')} DA
                            </span>
                          )}
                        </div>
                        {item.customer && (
                          <span className="order-board-card-sub">{item.customer}</span>
                        )}
                        {item.restaurant && (
                          <span className="order-board-card-restaurant">🏪 {item.restaurant}</span>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}

                {/* État vide */}
                {col.items.length === 0 && !snapshot.isDraggingOver && (
                  <div className="order-board-empty">
                    <span>Déposez une commande ici</span>
                  </div>
                )}

                {/* Drop placeholder (react-beautiful-dnd) */}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
