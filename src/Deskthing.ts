import { createDeskThing } from "@deskthing/client";

// Use createDeskThing() for proper instance with data fetching/listening capabilities
// The singleton DeskThing export should only be used for utility functions
const deskthing = createDeskThing();

export default deskthing;
