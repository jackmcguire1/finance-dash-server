import React, { createContext, useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
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
        return new Promise((resolve, reject) => {
            // If auth state is already known, resolve immediately
            const current = auth.currentUser;
            if (current) {
                resolve({ idToken: { payload: { sub: current.uid } } });
                return;
            }
            // Otherwise wait for the first auth state event
            const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
                unsubscribe();
                if (firebaseUser) {
                    resolve({ idToken: { payload: { sub: firebaseUser.uid } } });
                } else {
                    reject(new Error("No authenticated user"));
                }
            });
        });
    };

    const authenticate = async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return { idToken: { payload: { sub: credential.user.uid } } };
    };

    const logout = () => signOut(auth);

    return (
        <AccountContext.Provider value={{ authenticate, getSession, logout, user }}>
            {props.children}
        </AccountContext.Provider>
    );
};

export { Account, AccountContext };
