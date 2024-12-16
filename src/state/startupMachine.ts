import { assign, setup } from "xstate";

const startupMachine = setup({
	types: {
		context: {} as {
			status: string;
		},
		events: {} as {
			type: "UPDATE_STATUS";
			status: string;
		},
	},
	guards: {
		isReady: ({ context }) => context.status === "ready",
		isReadyEvent: ({ event }) => {
			console.log(event);

			return event.status === "ready";
		},
	},
}).createMachine({
	/** @xstate-layout N4IgpgJg5mDOIC5SwC4EMBOKCuAHAdAEYD2xKAlgHZQDEAqgAoAiAggCoCiA+gMpvt0eAbQAMAXUShcxWOQrFKkkAA9EAFgCM+AJy69+vQA4ANCACeiQ1o2GA7ACYAbLccjNztQF9Pp1JhwEJGRUtMp+KGD4aABmERgAFADMIikAlDR+WHhEpBTUohJIINKy8opFqgj29mr4agCsGjaOidr12oaJibamFgg29vi22hp6Ik6JjvaJ3j4glMQQcEqZAUolcuQKSpUAtI74KUfHx-YavYi79ToGt7ozc6vZQXlQ6zKb2xWItob4iRoHC4Ro5nI5Ohd+lZ8PUnCJuoY1I56iI2oZvL50FkCKtIO9SltyqBKmp7LZ8HYGr9EmpbADUWpITYRPgyYZqmoRI4bMM1A9vEA */
	id: "startup",
	initial: "booting",
	context: {
		status: "waiting",
	},
	on: {
		UPDATE_STATUS: {
			actions: assign(({ context, event }) => {
				return {
					...context,
					status: event.status,
				};
			}),
		},
	},
	states: {
		booting: {
			initial: "idle",
			states: {
				idle: {
					after: {
						1500: [
							{
								guard: "isReady",
								target: "#startup.started",
							},
							{
								target: "waiting",
							},
						],
					},
				},
				waiting: {
					always: {
						guard: "isReady",
						target: "#startup.started",
					},
					on: {
						UPDATE_STATUS: [
							{
								guard: "isReadyEvent",
								target: "#startup.started",
							},
						],
					},
				},
			},
		},
		started: {
			type: "final",
		},
	},
});

export default startupMachine;
