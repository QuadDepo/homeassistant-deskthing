import { HassEntity } from "home-assistant-js-websocket";
import { ActorRefFromLogic, assign, setup } from "xstate";
import deskthing from "../Deskthing";

const lightMachine = setup({
	types: {
		context: {} as HassEntity,
		input: {} as HassEntity,
		events: {} as
			| {
					type: "UPDATE";
					entity: HassEntity;
			  }
			| {
					type: "TOGGLE";
			  }
			| { type: "BRIGHTNESS"; brightness: number },
	},
}).createMachine({
	id: "light",
	context: ({ input }) => ({
		...input,
	}),
	on: {
		TOGGLE: {
			actions: ({ context }) => {
				deskthing.send({
					type: "get",
					payload: {
						type: "ENTITY_ACTION",
						action: "light/toggle",
						entity_id: context.entity_id,
					},
				});
			},
		},
		BRIGHTNESS: {
			actions: ({ context, event }) => {
				deskthing.send({
					type: "get",
					payload: {
						type: "ENTITY_ACTION",
						action: "light/turn_on",
						brightness: event.brightness,
						entity_id: context.entity_id,
					},
				});
			},
		},
		UPDATE: {
			actions: assign(({ context, event: { entity } }) => ({
				...context,
				...entity,
			})),
		},
	},
});

export type LightEntityMachineActor = ActorRefFromLogic<typeof lightMachine>;

export default lightMachine;
