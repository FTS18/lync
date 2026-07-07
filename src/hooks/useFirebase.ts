import { useEffect, useState } from "react";
import { 
    User, 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { ref, set, update, onValue, get } from "firebase/database";
import { auth, database } from "@/lib/firebase";
import { setGoogleAccessToken } from "@/lib/googleApi";

export interface DBUser {
    displayName?: string;
    photoURL?: string;
}

export function useFirebase() {
    const [user, setUser] = useState<User | null>(null);
    const [dbUser, setDbUser] = useState<DBUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Listen to user profile changes in Realtime Database
                const userRef = ref(database, 'users/' + currentUser.uid);
                onValue(userRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        setDbUser({
                            displayName: data.displayName,
                            photoURL: data.photoURL
                        });
                    }
                    setLoading(false);
                });
            } else {
                setDbUser(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Set initial user info in Realtime DB
    const setUserData = async (uid: string, username: string, email: string) => {
        await set(ref(database, 'users/' + uid), {
            displayName: username,
            email: email
        });
    };

    // Update last login timestamp
    const updateLastLogin = async (uid: string) => {
        const dt = new Date().toISOString();
        await update(ref(database, 'users/' + uid), {
            last_login: dt
        });
    };

    // Update profile info
    const updateProfileInfo = async (uid: string, displayName: string, photoURL: string) => {
        const updates: Record<string, string> = {};
        if (displayName) updates['displayName'] = displayName;
        if (photoURL) updates['photoURL'] = photoURL;
        await update(ref(database, 'users/' + uid), updates);
    };

    // Sign Up
    const signUp = (email: string, username: string, pass: string) => {
        return createUserWithEmailAndPassword(auth, email, pass).then(async (credential) => {
            await setUserData(credential.user.uid, username, email);
            await updateLastLogin(credential.user.uid);
            return credential;
        });
    };

    // Sign In with email/password
    const signIn = (email: string, pass: string) => {
        return signInWithEmailAndPassword(auth, email, pass).then(async (credential) => {
            await updateLastLogin(credential.user.uid);
            return credential;
        });
    };

    // Google Login
    const signInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        // Request Calendar + Drive scopes
        provider.addScope("https://www.googleapis.com/auth/calendar");
        provider.addScope("https://www.googleapis.com/auth/drive.file");
        provider.setCustomParameters({ prompt: 'select_account' });
        return signInWithPopup(auth, provider).then(async (result) => {
            // Extract and store the Google OAuth access token
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                setGoogleAccessToken(credential.accessToken);
            }
            // Check if user already exists in DB
            const userSnap = await get(ref(database, 'users/' + result.user.uid));
            if (!userSnap.exists()) {
                await setUserData(
                    result.user.uid, 
                    result.user.displayName || result.user.email?.split("@")[0] || "GoogleUser", 
                    result.user.email || ""
                );
            }
            await updateLastLogin(result.user.uid);
            return result;
        });
    };

    // Logout
    const logout = () => {
        return signOut(auth);
    };

    return {
        user,
        dbUser,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        logout,
        updateProfileInfo
    };
}

// Inline helper to mock get from firebase database
// (get was already imported above)
