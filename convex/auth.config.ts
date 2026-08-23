import { FIREBASE_AUTH_PROJECT_ID } from "./firebaseAuth";

const authConfig = {
  providers: FIREBASE_AUTH_PROJECT_ID
    ? [
        {
          domain: `https://securetoken.google.com/${FIREBASE_AUTH_PROJECT_ID}`,
          applicationID: FIREBASE_AUTH_PROJECT_ID,
        },
      ]
    : [],
};

export default authConfig;

