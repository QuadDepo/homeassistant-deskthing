import { HassEntities } from "home-assistant-js-websocket";
import { assign, createActor, setup, SnapshotFrom } from "xstate";
import deskthing from "../Deskthing";
import lightMachine, { LightEntityMachineActor } from "./lightMachine";
import getEntityType from "../utils/getEntityType";

type EntityMachineTypes = LightEntityMachineActor;

const getEntityMachine = (id: string) => {
	switch (getEntityType(id)) {
		case "light":
			return lightMachine;
		default:
			return null;
	}
};

const entityManagerMachine = setup({
	types: {
		context: {} as {
			refs: Record<string, EntityMachineTypes>;
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
	entry: () => {
		deskthing.send({
			type: "get",
			payload: {
				type: "CLIENT_CONNECTED",
			},
		});
	},
	on: {
		ENTITIES_CHANGE: {
			actions: assign(({ context, spawn, event: { entities } }) => {
				const refs: Record<string, EntityMachineTypes> = {};

				for (const entityId in entities) {
					const entityTarget = context.refs[entityId];

					// NOTE: If entity doesn't exist yet spawn new entity machine
					if (!entityTarget) {
						const machine = getEntityMachine(entityId);

						if (!machine) {
							// TODO: handle missing machine here
							continue;
						}

						const spawnedEntity = spawn(machine, {
							input: entities[entityId],
						});
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

export const entityManagerActor = createActor(entityManagerMachine).start();
