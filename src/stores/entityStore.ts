import { create } from "zustand";
import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { DeskThing } from "@deskthing/client";

const deskthing = DeskThing;

/** Default timeout in ms before reverting optimistic updates */
const DEFAULT_OPTIMISTIC_TIMEOUT = 5000;

/** Buffer added to transition time to account for network latency */
const TRANSITION_BUFFER_MS = 500;

interface PendingAction {
  previousState: HassEntity;
  timeoutId: ReturnType<typeof setTimeout>;
  optimisticState: string;
}

interface EntityStore {
  entities: HassEntities;
  pendingActions: Record<string, PendingAction>;

  updateEntities: (entities: HassEntities) => void;
  performAction: (entityId: string, action: string, data?: object) => void;
  performOptimisticAction: (
    entityId: string,
    action: string,
    optimisticState: string,
    options?: {
      data?: object;
      timeout?: number;
      onTimeout?: (entityId: string) => void;
    },
  ) => void;
  clearPendingAction: (entityId: string) => void;
  isPending: (entityId: string) => boolean;
}

export const useEntityStore = create<EntityStore>((set, get) => ({
  entities: {},
  pendingActions: {},

  updateEntities: (incomingEntities) =>
    set((state) => {
      const newPendingActions = { ...state.pendingActions };
      const newEntities = { ...state.entities };

      for (const entityId of Object.keys(incomingEntities)) {
        const incoming = incomingEntities[entityId];
        const pending = newPendingActions[entityId];

        if (pending) {
          // Entity has a pending optimistic action
          if (incoming.state === pending.optimisticState) {
            // HA confirmed our optimistic state - clear pending and apply
            clearTimeout(pending.timeoutId);
            delete newPendingActions[entityId];
            newEntities[entityId] = incoming;
          }
          // Otherwise: ignore this update, keep showing optimistic state
          // The timeout will handle reverting if HA never confirms
        } else {
          // No pending action - apply update normally
          newEntities[entityId] = incoming;
        }
      }

      return {
        entities: newEntities,
        pendingActions: newPendingActions,
      };
    }),

  performAction: (entityId, action, data) => {
    deskthing.send({
      type: "get",
      payload: {
        type: "ENTITY_ACTION",
        action,
        entity_id: entityId,
        ...(data && { data }),
      },
    });
  },

  performOptimisticAction: (entityId, action, optimisticState, options) => {
    const state = get();
    const entity = state.entities[entityId];

    if (!entity) return;

    // Clear any existing pending action for this entity
    const existingPending = state.pendingActions[entityId];
    if (existingPending) {
      clearTimeout(existingPending.timeoutId);
    }

    // Save the previous state for potential rollback
    const previousState = { ...entity };

    // Calculate effective timeout, accounting for transition time if specified
    const transitionSeconds =
      options?.data &&
      typeof options.data === "object" &&
      "transition" in options.data &&
      typeof options.data.transition === "number"
        ? options.data.transition
        : 0;
    const transitionTimeout = transitionSeconds * 1000 + TRANSITION_BUFFER_MS;
    const baseTimeout = options?.timeout ?? DEFAULT_OPTIMISTIC_TIMEOUT;
    const effectiveTimeout = Math.max(baseTimeout, transitionTimeout);

    // Create timeout for automatic rollback
    const timeoutId = setTimeout(() => {
      const currentState = get();
      const stillPending = currentState.pendingActions[entityId];

      if (stillPending) {
        // Revert to previous state
        set((s) => {
          const newPendingActions = { ...s.pendingActions };
          delete newPendingActions[entityId];

          return {
            entities: {
              ...s.entities,
              [entityId]: stillPending.previousState,
            },
            pendingActions: newPendingActions,
          };
        });

        // Call the optional timeout callback
        options?.onTimeout?.(entityId);
      }
    }, effectiveTimeout);

    // Apply optimistic update immediately
    set((s) => ({
      entities: {
        ...s.entities,
        [entityId]: {
          ...entity,
          state: optimisticState,
        },
      },
      pendingActions: {
        ...s.pendingActions,
        [entityId]: {
          previousState,
          timeoutId,
          optimisticState,
        },
      },
    }));

    // Send the actual action to Home Assistant
    deskthing.send({
      type: "get",
      payload: {
        type: "ENTITY_ACTION",
        action,
        entity_id: entityId,
        ...(options?.data && { data: options.data }),
      },
    });
  },

  clearPendingAction: (entityId) => {
    const pending = get().pendingActions[entityId];
    if (pending) {
      clearTimeout(pending.timeoutId);
      set((state) => {
        const newPendingActions = { ...state.pendingActions };
        delete newPendingActions[entityId];
        return { pendingActions: newPendingActions };
      });
    }
  },

  isPending: (entityId) => {
    return entityId in get().pendingActions;
  },
}));
