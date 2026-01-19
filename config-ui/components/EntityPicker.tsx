import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  memo,
} from "react";
import { cva, cx } from "class-variance-authority";
import Icon from "@mdi/react";
import { mdiClose, mdiMagnify } from "@mdi/js";
import type { EntityInfo } from "../../server/configServer/types";
import type { GridPosition } from "../../shared/types/grid";
import { useAvailableEntities } from "../stores/configStore";
import { domainIcons, domainLabels, defaultIcon } from "../utils/domainIcons";

export interface EntityPickerRef {
  open: (row: number, col: number) => void;
}

interface Props {
  onSelect: (entityId: string, position: GridPosition) => void;
}

const filterButtonStyles = cva(
  [
    "px-3",
    "py-1.5",
    "rounded-lg",
    "text-sm",
    "font-medium",
    "transition-all",
    "whitespace-nowrap",
    "flex-shrink-0",
  ],
  {
    variants: {
      active: {
        true: ["bg-blue-500", "text-white"],
        false: ["bg-white/10", "text-white/70", "hover:bg-white/20"],
      },
    },
  },
);

const EntityPicker = forwardRef<EntityPickerRef, Props>(function EntityPicker(
  { onSelect },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [targetCell, setTargetCell] = useState<GridPosition | null>(null);

  const availableEntities = useAvailableEntities();

  useImperativeHandle(ref, () => ({
    open: (row: number, col: number) => {
      setTargetCell({ row, col });
      setSearch("");
      setSelectedDomain(null);
      dialogRef.current?.showModal();
    },
  }));

  const handleClose = useCallback(() => {
    dialogRef.current?.close();
    setTargetCell(null);
  }, []);

  const handleSelect = useCallback(
    (entityId: string) => {
      if (targetCell) {
        onSelect(entityId, targetCell);
        handleClose();
      }
    },
    [targetCell, onSelect, handleClose],
  );

  const { domains, domainCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of availableEntities) {
      counts.set(e.domain, (counts.get(e.domain) || 0) + 1);
    }
    return {
      domains: Array.from(counts.keys()).sort(),
      domainCounts: counts,
    };
  }, [availableEntities]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    let filtered = availableEntities;

    // Filter by domain
    if (selectedDomain) {
      filtered = filtered.filter((e) => e.domain === selectedDomain);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.friendly_name.toLowerCase().includes(searchLower) ||
          e.entity_id.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [availableEntities, selectedDomain, search]);

  return (
    <dialog
      ref={dialogRef}
      className="hidden open:flex open:flex-col bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-white/10 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click (clicking the dialog element itself, not its children)
        if (e.target === dialogRef.current) {
          handleClose();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Add Entity</h2>
          <p className="text-sm text-white/50">
            Position: Row {(targetCell?.row ?? 0) + 1}, Column{" "}
            {(targetCell?.col ?? 0) + 1}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Icon path={mdiClose} size={1} className="text-white/70" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Icon
            path={mdiMagnify}
            size={0.9}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Search entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            autoFocus
          />
        </div>
      </div>

      {/* Domain filters */}
      <div className="px-4 py-3 flex-shrink-0 border-b border-white/10 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedDomain(null)}
            className={cx(
              filterButtonStyles({ active: selectedDomain === null }),
            )}
          >
            All ({availableEntities.length})
          </button>
          {domains.map((domain) => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={cx(
                filterButtonStyles({ active: selectedDomain === domain }),
              )}
            >
              {domainLabels[domain] || domain} ({domainCounts.get(domain)})
            </button>
          ))}
        </div>
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/50">
            <p>No entities found</p>
            {search && (
              <p className="text-sm mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntities.map((entity) => (
              <EntityRow
                key={entity.entity_id}
                entity={entity}
                onSelect={() => handleSelect(entity.entity_id)}
              />
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
});

interface EntityRowProps {
  entity: EntityInfo;
  onSelect: () => void;
}

const EntityRow = memo(function EntityRow({
  entity,
  onSelect,
}: EntityRowProps) {
  const iconPath = domainIcons[entity.domain] || defaultIcon;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 flex-shrink-0">
        <Icon path={iconPath} size={1} className="text-white/80" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">
          {entity.friendly_name}
        </div>
        <div className="text-white/50 text-sm truncate">{entity.entity_id}</div>
      </div>
      <div className="text-white/30 text-xs px-2 py-1 rounded bg-white/5">
        {domainLabels[entity.domain] || entity.domain}
      </div>
    </button>
  );
});

export default EntityPicker;
