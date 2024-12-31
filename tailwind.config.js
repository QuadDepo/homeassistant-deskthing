/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	safelist: [{ pattern: /(row-start|col-start|row-span|col-span)-./ }],
	theme: {
		extend: {},
	},
	plugins: [],
};
