"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortableProduct = {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  imageThumbUrl?: string;
  imageUrl?: string;
};

function GripIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="7" cy="5" r="1.25" />
      <circle cx="13" cy="5" r="1.25" />
      <circle cx="7" cy="10" r="1.25" />
      <circle cx="13" cy="10" r="1.25" />
      <circle cx="7" cy="15" r="1.25" />
      <circle cx="13" cy="15" r="1.25" />
    </svg>
  );
}

function ProductRowContent({
  product,
  index,
  dragHandleProps,
  isOverlay,
  onRemove,
}: {
  product: SortableProduct;
  index: number;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isOverlay?: boolean;
  onRemove?: () => void;
}) {
  const thumb = product.imageThumbUrl || product.imageUrl;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border bg-[#faf9f7] px-2 py-2.5 sm:gap-3 sm:px-3 ${
        isOverlay
          ? "border-accent shadow-lg ring-1 ring-accent/30"
          : "border-border"
      }`}
    >
      <button
        type="button"
        className="inline-flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted transition hover:bg-white hover:text-foreground active:cursor-grabbing touch-none"
        aria-label={`Drag to reorder ${product.name}`}
        title="Drag to reorder"
        {...dragHandleProps}
      >
        <GripIcon />
      </button>
      <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted">
        {index + 1}
      </span>
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {product.name}
        </p>
        <p className="truncate text-xs text-muted">
          {product.brand || product.slug}
        </p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-700"
          aria-label={`Remove ${product.name}`}
          title="Remove"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M7.5 3.5h5M4 5.5h12M15.5 5.5l-.7 9.1a1.5 1.5 0 0 1-1.5 1.4H6.7a1.5 1.5 0 0 1-1.5-1.4L4.5 5.5M8.5 8.5v5M11.5 8.5v5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <span className="h-8 w-8" />
      )}
    </div>
  );
}

function SortableProductRow({
  product,
  index,
  onRemove,
}: {
  product: SortableProduct;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProductRowContent
        product={product}
        index={index}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

type Props = {
  products: SortableProduct[];
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
};

export function SortableCollectionProducts({
  products,
  onReorder,
  onRemove,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeProduct = activeId
    ? products.find((p) => p.id === activeId) || null
    : null;
  const activeIndex = activeProduct
    ? products.findIndex((p) => p.id === activeProduct.id)
    : -1;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(products, oldIndex, newIndex).map((p) => p.id));
  }

  function onDragCancel() {
    setActiveId(null);
  }

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        No products yet. Search above to add products to this collection.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext
        items={products.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {products.map((product, index) => (
            <SortableProductRow
              key={product.id}
              product={product}
              index={index}
              onRemove={() => onRemove(product.id)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}>
        {activeProduct ? (
          <ProductRowContent
            product={activeProduct}
            index={activeIndex}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
