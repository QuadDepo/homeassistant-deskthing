import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortableEntity from "./SortableEntity";
import { useConfigStore, useEntitiesWithLayout } from "../stores/configStore";

const EntityList = () => {
  const entities = useEntitiesWithLayout();
  const reorderEntities = useConfigStore((state) => state.reorderEntities);
  const toggleEntity = useConfigStore((state) => state.toggleEntity);
  const layout = useConfigStore((state) => state.layout);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layout.items.findIndex(
        (item) => item.entityId === active.id
      );
      const newIndex = layout.items.findIndex(
        (item) => item.entityId === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderEntities(oldIndex, newIndex);
      }
    }
  };

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/50">
        <p className="text-lg">No entities found</p>
        <p className="text-sm mt-2">
          Make sure Home Assistant is connected and has entities available
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext
        items={entities.map((e) => e.entity_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {entities.map((entity) => (
            <SortableEntity
              key={entity.entity_id}
              entity={entity}
              onToggle={() => toggleEntity(entity.entity_id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default EntityList;
