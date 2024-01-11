import express from "express";
import RutrackerApi from 'rutracker-api';
const rutracker = new RutrackerApi();

const user = "nemec33"
const pass = "Passwort35"



rutracker.login({ username: user, password: pass })
    .then(() => {
        console.log('Authorized');
    })
    .catch(err => console.error(err));

