import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";
import { createContext, useEffect, useState } from "react";
import { auth } from "../firebase";

const AccountContext = createContext();

const Account = (props) => {
    // undefined = auth loading, null = signed out, object = signed in
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        return onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser ?? null);
        });
    }, []);

    const getSession = async () => {
        const current = auth.currentUser;
        if (current) {
            const token = await current.getIdToken();
            return { token };
        }
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                unsubscribe();
                if (firebaseUser) {
                    const token = await firebaseUser.getIdToken();
                    resolve({ token });
                } else {
                    reject(new Error("No authenticated user"));
                }
            });
        });
    };

    const authenticate = async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (email, password, displayName) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(credential.user, { displayName });
        }
        return credential;
    };

    const resetPassword = (email) => sendPasswordResetEmail(auth, email);

    const logout = () => signOut(auth);

    return (
        <AccountContext.Provider value={{ authenticate, register, resetPassword, getSession, logout, user }}>
            {props.children}
        </AccountContext.Provider>
    );
};

export { Account, AccountContext };
