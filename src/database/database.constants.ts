//* tokens
export const MONGO_CLIENT = Symbol("MONGO_CLIENT"); //* mongo db client

//* mongo names and identifier
export const DATABASE_NAME = "rezepteapp";

/** Projection that leaves out Mongo's internal `_id`, so documents match the domain types. */
export const WITHOUT_MONGO_ID = { _id: 0 } as const;
