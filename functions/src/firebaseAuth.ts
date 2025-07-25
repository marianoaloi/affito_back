import * as admin from "firebase-admin";
import { Request, Response } from "express";

// Initialize Firebase Admin SDK.
// The SDK is initialized automatically when deployed to Firebase Functions.
// This check prevents a "default app already exists" error when running locally.
if (admin.apps.length === 0) {
  admin.initializeApp({projectId: "affitiudine"});
}

// Middleware to verify Firebase ID Token
const authenticate = async (req: Request, res: Response) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    console.error("No Firebase ID token was passed as a Bearer token in the Authorization header.",
        "Make sure you authorize your request by providing the following HTTP header:",
        "    Authorization: Bearer <Firebase ID Token>");
    res.status(403).send("Unauthorized");
    return;
  }

  const idToken = req.headers.authorization.split("Bearer ")[1];

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedIdToken; // Attach decoded token to request
    // next();
    return decodedIdToken;
  } catch (error) {
    console.error("Error while verifying Firebase ID token:", error);
    res.status(403).send("Unauthorized");
  }
  return;
};

export default authenticate;
