import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { ActorRefFromLogic, assign, setup, SnapshotFrom } from "xstate";

// TODO: Create seperate file for this
const entityMachine = setup({
	types: {
		context: {} as HassEntity,
		input: {} as HassEntity,
		events: {} as {
			type: "UPDATE";
			entity: HassEntity;
		},
	},
}).createMachine({
	id: "entity",
	context: ({ input }) => ({
		...input,
	}),
	on: {
		UPDATE: {
			actions: assign(({ context, event: { entity } }) => ({
				...context,
				...entity,
			})),
		},
	},
});

export type EntityMachineActor = ActorRefFromLogic<typeof entityMachine>;

const entityManagerMachine = setup({
	types: {
		context: {} as {
			refs: Record<string, EntityMachineActor>;
		},
		events: {} as {
			type: "ENTITIES_CHANGE";
			entities: HassEntities;
		},
	},
}).createMachine({
	id: "entityManager",
	context: {
		refs: {},
	},
	on: {
		ENTITIES_CHANGE: {
			actions: assign(({ context, spawn, event: { entities } }) => {
				const refs: Record<string, EntityMachineActor> = {};

				for (const entityId in entities) {
					const entityTarget = context.refs[entityId];

					// NOTE: If entity doesn't exist yet spawn new entity machine
					if (!entityTarget) {
						const spawnedEntity = spawn(entityMachine);
						refs[entityId] = spawnedEntity;
						continue;
					}

					entityTarget.send({
						type: "UPDATE",
						entity: entities[entityId],
					});
				}

				return {
					refs: { ...context.refs, ...refs },
				};
			}),
		},
	},
});

export type EntityManagerMachineSnapshot = SnapshotFrom<
	typeof entityManagerMachine
>;

export default entityManagerMachine;
